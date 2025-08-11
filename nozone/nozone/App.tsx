import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// Initialize console filters for React 19 compatibility
// Dev-only console filters (avoid altering production logs)
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('./src/utils/consoleFilters');
}

import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { QueueScreen } from './src/screens/QueueScreen';
import { ComposeScreenEnhanced } from './src/screens/ComposeScreenEnhanced';
import { ComposeScreenWithUsers } from './src/screens/ComposeScreenWithUsers';
import { SettingsScreen } from './src/screens/SettingsScreenEnhanced';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { DirectInboxScreen } from './src/screens/DirectInboxScreen';
import { DirectComposeScreen } from './src/screens/DirectComposeScreen';
import { DirectChatScreen } from './src/screens/DirectChatScreen';
import { UIShowcaseScreen } from './src/screens/UIShowcaseScreen';
import { ResponsiveDemo } from './src/screens/ResponsiveDemo';
import { EnhancementsDemo } from './src/screens/EnhancementsDemo';
import { Loading } from './src/components/Loading';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { NetworkService } from './src/services/network';
import { NotificationService } from './src/services/notifications';
import { SupabaseService } from './src/services/supabase';
import { StorageService } from './src/services/storage';
import { AuthService } from './src/services/auth';
import { PerformanceService } from './src/services/performanceService';
import { initCrashReporting, captureException } from './src/services/crashReporter';
import { logger } from './src/utils/logger';
import { Env } from './src/utils/env';
import { OfflineQueueService } from './src/services/offlineQueueService';
import { testSupabaseConnection, testDatabaseTables } from './src/utils/supabaseTest';
import { useBackHandler } from './src/hooks/useBackHandler';
import { User, Message } from './src/types';
import { theme, buildTheme, Theme } from './src/utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Theme context
export const ThemeContext = React.createContext<{ theme: Theme; toggle: () => void; mode: 'light' | 'dark'; setMode: (m: 'light' | 'dark') => void }>({
  theme: theme as Theme,
  toggle: () => {},
  mode: 'light',
  setMode: () => {},
});

type Screen = 'login' | 'home' | 'queue' | 'compose' | 'composeWithUsers' | 'settings' | 'profile' | 'directInbox' | 'directCompose' | 'directChat' | 'uiShowcase' | 'responsiveDemo' | 'enhancementsDemo';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [user, setUser] = useState<User | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<'light' | 'dark'>(systemScheme === 'dark' ? 'dark' : 'light');
  const activeTheme = useMemo(() => buildTheme(mode) as Theme, [mode]);
  const toggle = useCallback(() => setMode(m => (m === 'light' ? 'dark' : 'light')), []);

  // Persist theme mode
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('nozone:theme');
        if (stored === 'light' || stored === 'dark') {
          setMode(stored);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('nozone:theme', mode).catch(() => {});
  }, [mode]);
  
  // Direct messaging state
  const [conversationId, setConversationId] = useState<string>('');
  const [otherUser, setOtherUser] = useState<{ id: string; username: string; name: string } | null>(null);
  const [prefilledUsername, setPrefilledUsername] = useState<string>('');

  // Handle hardware back button
  useBackHandler(() => {
    if (currentScreen === 'login' || currentScreen === 'home') {
      // Allow default behavior (exit app) for login and home screens
      return false;
    }
    
    // Handle navigation back for other screens
    switch (currentScreen) {
      case 'directCompose':
        setCurrentScreen('directInbox');
        break;
      case 'directChat':
        setCurrentScreen('directInbox');
        break;
      default:
        // For all other screens, go back to home
        handleBackToHome();
        break;
    }
    
    // Prevent default behavior (we handled it)
    return true;
  });

  useEffect(() => {
    PerformanceService.trackAppStartup();
    initCrashReporting().catch(e => logger.error('Crash reporter init failed', e));
    initializeApp();
    // Global error capture (RN fatal)
    const origHandler = ErrorUtils.getGlobalHandler?.();
    if (ErrorUtils.setGlobalHandler) {
      ErrorUtils.setGlobalHandler((err: any, isFatal?: boolean) => {
        captureException(err, isFatal ? 'fatal' : 'error');
        origHandler && origHandler(err, isFatal);
      });
    }
  }, []);

  const initializeApp = async () => {
    try {
  logger.info('App init start', { env: Env.BUILD_ENV });
      const supabaseConnected = await SupabaseService.testConnection();
      
      if (!supabaseConnected) {
  logger.warn('Supabase not connected - offline mode');
      }

      // Initialize services
      await NetworkService.getCurrentStatus();
      NetworkService.startListening();
      await NotificationService.requestPermissions();
      await OfflineQueueService.initialize();

      // Check if user is already logged in
      const existingUser = await AuthService.getCurrentUser();
      if (existingUser) {
        // Update user activity if connected
        if (supabaseConnected) {
          await AuthService.updateLastActive(existingUser.id);
        }
        setUser(existingUser);
        setCurrentScreen('home');
      }

      PerformanceService.markAppReady();
  // Count app open
  try { await StorageService.incrementDailyOpenCount(); } catch (e) { /* noop */ }
    } catch (error) {
  logger.error('App initialization error', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentScreen('home');
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setUser(null);
    setCurrentScreen('login');
  };

  const handleCompose = () => {
    setEditingMessage(null);
    setCurrentScreen('compose');
  };

  const handleComposeWithUsers = () => {
    setEditingMessage(null);
    setCurrentScreen('composeWithUsers');
  };

  const handleQueue = () => {
    setCurrentScreen('queue');
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessage(message);
    setCurrentScreen('compose');
  };

  const handleBackToHome = () => {
    setEditingMessage(null);
    setCurrentScreen('home');
  };

  const handleSettings = () => {
    setCurrentScreen('settings');
  };

  const handleProfile = () => {
    setCurrentScreen('profile');
  };

  // Direct messaging handlers
  const handleDirectInbox = () => {
    setCurrentScreen('directInbox');
  };

  const handleDirectCompose = (username?: string) => {
    setPrefilledUsername(username || '');
    setCurrentScreen('directCompose');
  };

  const handleDirectChat = (convId: string, otherUserData: { id: string; username: string; name: string }) => {
    setConversationId(convId);
    setOtherUser(otherUserData);
    setCurrentScreen('directChat');
  };

  const handleUIShowcase = () => {
    setCurrentScreen('uiShowcase');
  };

  const handleResponsiveDemo = () => {
    setCurrentScreen('responsiveDemo');
  };
  
  const handleEnhancementsDemo = () => {
    setCurrentScreen('enhancementsDemo');
  };

  if (loading) {
    return <Loading fullScreen text="Initializing Nozone..." />;
  }

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen onLogin={handleLogin} />;
      
      case 'home':
        if (!user) return <LoginScreen onLogin={handleLogin} />;
        return (
          <HomeScreen
            user={user}
            onCompose={handleCompose}
            onComposeWithUsers={handleComposeWithUsers}
            onQueue={handleQueue}
            onSettings={handleSettings}
            onProfile={handleProfile}
            onDirectInbox={handleDirectInbox}
            onDirectCompose={handleDirectCompose}
            onUIShowcase={handleUIShowcase}
            onResponsiveDemo={handleResponsiveDemo}
            onEnhancementsDemo={handleEnhancementsDemo}
          />
        );

      case 'queue':
        if (!user) return <LoginScreen onLogin={handleLogin} />;
        return (
          <QueueScreen
            user={user}
            onBack={handleBackToHome}
            onEditMessage={handleEditMessage}
          />
        );
      
      case 'compose':
        if (!user) return <LoginScreen onLogin={handleLogin} />;
        return (
          <ComposeScreenEnhanced
            user={user}
            editMessage={editingMessage || undefined}
            onBack={handleBackToHome}
            onSave={handleBackToHome}
          />
        );

      case 'composeWithUsers':
        if (!user) return <LoginScreen onLogin={handleLogin} />;
        return (
          <ComposeScreenWithUsers
            user={user}
            editMessage={editingMessage || undefined}
            onBack={handleBackToHome}
            onSave={handleBackToHome}
            onStartDirectChat={(selectedUser) => {
              // Create a conversation and navigate to direct chat
              handleDirectChat('', {
                id: selectedUser.id,
                username: selectedUser.username || '',
                name: selectedUser.name
              });
            }}
          />
        );

      case 'profile':
        if (!user) return <LoginScreen onLogin={handleLogin} />;
        return (
          <ProfileScreen
            user={user}
            onBack={handleBackToHome}
            onLogout={handleLogout}
          />
        );
      
      case 'settings':
        if (!user) return <LoginScreen onLogin={handleLogin} />;
        return (
          <SettingsScreen
            user={user}
            onBack={handleBackToHome}
            onLogout={handleLogout}
          />
        );
      
      case 'directInbox':
        if (!user) return <LoginScreen onLogin={handleLogin} />;
        return (
          <DirectInboxScreen
            user={user}
            onBack={handleBackToHome}
            onOpenChat={handleDirectChat}
            onStartNewChat={handleDirectCompose}
          />
        );
      
      case 'directCompose':
        if (!user) return <LoginScreen onLogin={handleLogin} />;
        return (
          <DirectComposeScreen
            user={user}
            onBack={() => setCurrentScreen('directInbox')}
            onChatCreated={handleDirectChat}
            prefilledUsername={prefilledUsername}
          />
        );
      
      case 'uiShowcase':
        return <UIShowcaseScreen onBack={handleBackToHome} />;

      case 'responsiveDemo':
        return <ResponsiveDemo onBack={handleBackToHome} />;
        
      case 'enhancementsDemo':
        return <EnhancementsDemo onBack={() => setCurrentScreen('home')} />;
      
      case 'directChat':
        if (!user || !otherUser) return <LoginScreen onLogin={handleLogin} />;
        return (
          <DirectChatScreen
            user={user}
            conversationId={conversationId}
            otherUser={otherUser}
            onBack={() => setCurrentScreen('directInbox')}
          />
        );
      
      default:
        return <LoginScreen onLogin={handleLogin} />;
    }
  };

  return (
    <ErrorBoundary>
  <ThemeContext.Provider value={{ theme: activeTheme, toggle, mode, setMode }}>
        <SafeAreaProvider>
          <LinearGradient colors={[activeTheme.colors.background, activeTheme.colors.backgroundSecondary]} style={[styles.container,{backgroundColor: activeTheme.colors.background}]}>          
            <StatusBar style={mode === 'dark' ? 'light' : 'dark'} backgroundColor={activeTheme.colors.background} />
            {renderCurrentScreen()}
            <Toast />
          </LinearGradient>
        </SafeAreaProvider>
      </ThemeContext.Provider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
