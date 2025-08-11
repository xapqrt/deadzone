import Constants from 'expo-constants';
import { Env, isProd } from '../utils/env';
import { logger } from '../utils/logger';

// Minimal pluggable crash reporter. Integrate Sentry if DSN present. Lazy load to keep bundle light.

let sentry: any = null;
let sentryInitTried = false;

export async function initCrashReporting() {
  if (!isProd) { return; }
  if (sentryInitTried) return;
  sentryInitTried = true;
  if (!Env.SENTRY_DSN) { return; }
  try {
    // dynamic require so bundler won't need package unless installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sentry = require('sentry-expo');
    sentry.init?.({ dsn: Env.SENTRY_DSN, enableInExpoDevelopment: false, debug: false });
    logger.info('Sentry (optional) initialized');
  } catch (e) {
    logger.warn('Sentry not available (optional dependency). Install sentry-expo to enable.');
  }
}

export function captureException(err: any, context?: string) {
  logger.error('Captured exception', context, err);
  if (sentry) {
    try {
      sentry.captureException?.(err, { extra: { context, appOwnership: Constants.appOwnership } });
    } catch {}
  }
}
