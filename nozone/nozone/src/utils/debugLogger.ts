import AsyncStorage from '@react-native-async-storage/async-storage';

export class DebugLogger {
  private static logs: string[] = [];
  private static maxLogs = 100;

  static async init() {
    // Set up console log capture for debugging
    if (__DEV__) {
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      console.log = (...args) => {
        this.addLog('LOG', args);
        originalLog(...args);
      };

      console.error = (...args) => {
        this.addLog('ERROR', args);
        originalError(...args);
      };

      console.warn = (...args) => {
        this.addLog('WARN', args);
        originalWarn(...args);
      };
    }
  }

  private static addLog(level: string, args: any[]) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    const logEntry = `[${timestamp}] ${level}: ${message}`;
    
    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Store in AsyncStorage for persistence
    AsyncStorage.setItem('debug_logs', JSON.stringify(this.logs)).catch(() => {});
  }

  static async getLogs(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem('debug_logs');
      return stored ? JSON.parse(stored) : this.logs;
    } catch {
      return this.logs;
    }
  }

  static async clearLogs() {
    this.logs = [];
    await AsyncStorage.removeItem('debug_logs');
  }

  static async exportLogs(): Promise<string> {
    const logs = await this.getLogs();
    return logs.join('\n');
  }
}
