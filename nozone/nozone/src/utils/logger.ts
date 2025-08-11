import { isProd } from './env';

// Simple leveled logger that suppresses verbose output in production
class Logger {
  debugEnabled = !isProd;

  setDebug(enabled: boolean) { this.debugEnabled = enabled; }

  debug(...args: any[]) { if (this.debugEnabled) console.log('[DEBUG]', ...args); }
  info(...args: any[]) { console.log('[INFO]', ...args); }
  warn(...args: any[]) { console.warn('[WARN]', ...args); }
  error(...args: any[]) { console.error('[ERROR]', ...args); }
}

export const logger = new Logger();
