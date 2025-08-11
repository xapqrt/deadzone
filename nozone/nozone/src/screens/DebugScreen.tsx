import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DebugLogger } from '../utils/debugLogger';
import { theme } from '../utils/theme';

interface DebugScreenProps {
  onBack: () => void;
}

export function DebugScreen({ onBack }: DebugScreenProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const debugLogs = await DebugLogger.getLogs();
      setLogs(debugLogs);
    } catch (error) {
      console.error('Failed to load debug logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all debug logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await DebugLogger.clearLogs();
            setLogs([]);
          }
        }
      ]
    );
  };

  const handleShareLogs = async () => {
    try {
      const logsText = await DebugLogger.exportLogs();
      await Share.share({
        message: logsText,
        title: 'Nozone Debug Logs'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share logs');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading debug logs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Debug Logs</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShareLogs} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearLogs} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.logInfo}>
        <Text style={styles.logCount}>{logs.length} log entries</Text>
        <TouchableOpacity onPress={loadLogs} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.logsContainer} showsVerticalScrollIndicator={true}>
        {logs.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No debug logs available</Text>
            <Text style={styles.emptySubtext}>Logs will appear here when the app runs</Text>
          </View>
        ) : (
          logs.map((log, index) => (
            <View key={index} style={styles.logEntry}>
              <Text style={styles.logText} selectable>
                {log}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    paddingRight: 16,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
  },
  actionButtonText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '500',
  },
  logInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  logCount: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.secondary,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '500',
  },
  logsContainer: {
    flex: 1,
    padding: 16,
  },
  logEntry: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
