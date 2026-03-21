/**
 * Obfuscation Configuration for Dashboard JavaScript Files
 * 
 * Medium obfuscation level - balances protection with performance
 * and maintainability.
 * 
 * This config can be customized per environment by passing options
 * to the build script.
 */

const isProduction = process.env.NODE_ENV === 'production';

const baseConfig = {
  // Compact output (remove whitespace)
  compact: true,
  
  // Control flow flattening (makes code harder to read)
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  
  // Dead code injection (adds fake code)
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  
  // Debug protection (prevents debugging)
  debugProtection: false, // Disabled - can break functionality
  debugProtectionInterval: 0,
  
  // Disable console output removal (keep console.log for debugging in dev)
  // In production, console statements are removed for security and performance
  disableConsoleOutput: isProduction,
  
  // Source maps (disabled in production for security)
  sourceMap: !isProduction,
  sourceMapMode: 'separate',
  
  // Identifier names generator
  identifierNamesGenerator: 'hexadecimal',
  identifiersPrefix: '',
  
  // Log level
  log: false,
  
  // Numbers to strings
  numbersToExpressions: true,
  
  // Rename globals
  renameGlobals: false, // Keep false to avoid breaking global references
  
  // Self-defending code (prevents tampering)
  selfDefending: true,
  
  // Simplify code
  simplify: true,
  
  // Split strings into chunks
  splitStrings: true,
  splitStringsChunkLength: 10,
  
  // String array encoding
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  
  // Transform object keys
  transformObjectKeys: true,
  
  // Unicode escape sequence
  unicodeEscapeSequence: false, // Keep false for readability in dev
};

export default baseConfig;

/**
 * Get production-specific obfuscation config
 * Used when building for production to ensure console output is disabled
 */
export function getProductionConfig() {
  return {
    ...baseConfig,
    disableConsoleOutput: true,
    sourceMap: false,
  };
}

/**
 * Get development-specific obfuscation config
 * Keeps console output for debugging
 */
export function getDevelopmentConfig() {
  return {
    ...baseConfig,
    disableConsoleOutput: false,
    sourceMap: true,
  };
}
