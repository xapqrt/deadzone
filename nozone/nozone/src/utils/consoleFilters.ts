/**
 * Console wrapper for debugging - ONLY filters non-critical display warnings
 * NEVER filters hook errors or functional issues
 */

const originalWarn = console.warn;
const originalError = console.error;

// Only filter truly non-functional cosmetic warnings
const filterOnlyCosmetic = (message: any, ...args: any[]) => {
  const messageStr = String(message);
  
  // ONLY filter these specific cosmetic warnings - NO HOOK ERRORS
  const cosmeticWarnings = [
    'StatusBar backgroundColor is not supported with edge-to-edge enabled',
    'sendAccessibilityEvent() dropping event: Cannot find view with tag',
  ];
  
  const isCosmeticWarning = cosmeticWarnings.some(warning => 
    messageStr.includes(warning)
  );
  
  if (isCosmeticWarning) {
    console.log('🎨 [Cosmetic]:', messageStr.substring(0, 80) + '...');
    return;
  }
  
  return { message, args };
};

// Override console.warn - but let ALL hook errors through
console.warn = (message: any, ...args: any[]) => {
  const filtered = filterOnlyCosmetic(message, ...args);
  if (filtered) {
    originalWarn(filtered.message, ...filtered.args);
  }
};

// Override console.error but NEVER filter hook errors
console.error = (message: any, ...args: any[]) => {
  const messageStr = String(message);
  // If it contains hook error keywords, ALWAYS show it
  if (messageStr.includes('hook') || messageStr.includes('Hook')) {
    originalError(message, ...args);
    return;
  }
  
  if (messageStr.includes('Warning:')) {
    const filtered = filterOnlyCosmetic(message, ...args);
    if (filtered) {
      originalError(filtered.message, ...filtered.args);
    }
  } else {
    originalError(message, ...args);
  }
};

export const originalConsole = {
  warn: originalWarn,
  error: originalError,
};

console.log('🛠️ Console filters active - Hook errors will ALWAYS show');
