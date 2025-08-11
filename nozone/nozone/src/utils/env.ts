// Centralized environment variable access (no secrets committed)
// Use EXPO_PUBLIC_ prefix for values needed on client.
export const Env = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'SET_ME',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'SET_ME',
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  BUILD_ENV: process.env.EXPO_PUBLIC_BUILD_ENV || (__DEV__ ? 'development' : 'production'),
};

export const isProd = Env.BUILD_ENV === 'production';
export const isDev = !isProd;
