import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function DebugApp() {
  const [logs, setLogs] = useState<string[]>(['App started']);

  const addLog = (message: string) => {
    console.log('DEBUG:', message);
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  useEffect(() => {
    const initializeDebug = async () => {
      try {
        addLog('Starting debug initialization...');
        
        // Test 1: Basic imports
        addLog('✓ Basic React Native imports working');
        
        // Test 2: Expo imports
        addLog('✓ Expo imports working');
        
        // Test 3: AsyncStorage
        try {
          const AsyncStorage = await import('@react-native-async-storage/async-storage');
          addLog('✓ AsyncStorage import working');
          await AsyncStorage.default.setItem('test', 'value');
          const value = await AsyncStorage.default.getItem('test');
          addLog(`✓ AsyncStorage operations working: ${value}`);
        } catch (e) {
          addLog(`❌ AsyncStorage error: ${e}`);
        }
        
        // Test 4: Environment variables
        const { Env } = await import('./src/utils/env');
        addLog(`✓ Env loaded: URL=${Env.SUPABASE_URL.substring(0, 20)}...`);
        addLog(`✓ Env loaded: KEY=${Env.SUPABASE_ANON_KEY.substring(0, 20)}...`);
        
        // Test 5: Supabase
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(Env.SUPABASE_URL, Env.SUPABASE_ANON_KEY);
          addLog('✓ Supabase client created');
          
          // Test connection
          const { data, error } = await supabase.from('users').select('id').limit(1);
          if (error) {
            addLog(`⚠️ Supabase query error: ${error.message}`);
          } else {
            addLog('✓ Supabase connection test successful');
          }
        } catch (e) {
          addLog(`❌ Supabase error: ${e}`);
        }
        
        // Test 6: Other services
        try {
          const { NetworkService } = await import('./src/services/network');
          addLog('✓ NetworkService import working');
        } catch (e) {
          addLog(`❌ NetworkService error: ${e}`);
        }
        
        try {
          const { AuthService } = await import('./src/services/auth');
          addLog('✓ AuthService import working');
        } catch (e) {
          addLog(`❌ AuthService error: ${e}`);
        }
        
        addLog('🎉 Debug initialization complete!');
        
      } catch (error) {
        addLog(`❌ FATAL ERROR: ${error}`);
        console.error('Debug initialization failed:', error);
      }
    };

    initializeDebug();
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Text style={styles.title}>🐛 Nozone Debug Mode</Text>
        <ScrollView style={styles.logContainer}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>
              {log}
            </Text>
          ))}
        </ScrollView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  logContainer: {
    flex: 1,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 5,
    padding: 5,
    backgroundColor: '#f5f5f5',
  },
});
