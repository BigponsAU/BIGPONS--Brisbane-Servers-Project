/**
 * DESIGN TOKEN MAP - TypeScript Mapping
 * 
 * Provides programmatic access to design tokens for validation,
 * IDE autocomplete, and design block integration.
 */

export interface TokenCategory {
  base: string[];
  spacing: string[];
  typography: string[];
  color: string[];
  opacity: string[];
  shadow: string[];
  borderRadius: string[];
  transition: string[];
  pattern: string[];
  component: string[];
}

/**
 * Base design tokens - fundamental values
 */
export const baseTokens = {
  phi: '--phi',
  phiInv: '--phi-inv',
  phiMod: '--phi-mod',
  sqrt2: '--sqrt2',
  sqrt2Inv: '--sqrt2-inv',
  phiSqrt: '--phi-sqrt',
  phiCubed: '--phi-cubed',
  phiHalf: '--phi-half',
  phiQuarter: '--phi-quarter',
  base: '--base',
  fontBase: '--font-base',
  spaceBase: '--space-base',
} as const;

/**
 * Spacing tokens - phi-based scale
 */
export const spacingTokens = {
  xs: '--space-xs',
  sm: '--space-sm',
  md: '--space-md',
  lg: '--space-lg',
  xl: '--space-xl',
  '2xl': '--space-2xl',
  '3xl': '--space-3xl',
  '4xl': '--space-4xl',
  '5xl': '--space-5xl',
  '6xl': '--space-6xl',
} as const;

/**
 * Typography tokens - phi-based scale
 */
export const typographyTokens = {
  xs: '--text-xs',
  sm: '--text-sm',
  base: '--text-base',
  lg: '--text-lg',
  xl: '--text-xl',
  '2xl': '--text-2xl',
  '3xl': '--text-3xl',
  lgPractical: '--text-lg-practical',
  xlPractical: '--text-xl-practical',
  '2xlPractical': '--text-2xl-practical',
  '3xlPractical': '--text-3xl-practical',
  '4xlPractical': '--text-4xl-practical',
  '5xlPractical': '--text-5xl-practical',
  h1: '--font-h1',
  h2: '--font-h2',
  h3: '--font-h3',
  weightNormal: '--font-weight-normal',
  weightMedium: '--font-weight-medium',
  weightSemibold: '--font-weight-semibold',
  weightBold: '--font-weight-bold',
  weightExtrabold: '--font-weight-extrabold',
} as const;

/**
 * Color tokens - semantic color system
 */
export const colorTokens = {
  primary: '--primary-color',
  primaryDark: '--primary-dark',
  primaryLight: '--primary-light',
  primaryUltraLight: '--primary-ultra-light',
  success: '--color-success',
  warning: '--color-warning',
  error: '--color-error',
  neutral: '--color-neutral',
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  textLight: '--text-light',
  background: '--background',
  surface: '--surface',
  surfaceElevated: '--surface-elevated',
  bgPrimary: '--bg-primary',
  bgSecondary: '--bg-secondary',
  bgTertiary: '--bg-tertiary',
  bgElevated: '--bg-elevated',
  border: '--border',
  borderLight: '--border-light',
  wisdom: '--color-wisdom',
  calm: '--color-calm',
  calmLight: '--color-calm-light',
  darkSurface: '--dark-surface',
} as const;

/**
 * Opacity tokens
 */
export const opacityTokens = {
  subtle: '--opacity-subtle',
  soft: '--opacity-soft',
  medium: '--opacity-medium',
  strong: '--opacity-strong',
  full: '--opacity-full',
  light: '--opacity-light',
} as const;

/**
 * Shadow tokens
 */
export const shadowTokens = {
  xs: '--shadow-xs',
  sm: '--shadow-sm',
  default: '--shadow',
  md: '--shadow-md',
  lg: '--shadow-lg',
  xl: '--shadow-xl',
  primary: '--shadow-primary',
  primaryLg: '--shadow-primary-lg',
} as const;

/**
 * Border radius tokens
 */
export const borderRadiusTokens = {
  sm: '--radius-sm',
  default: '--border-radius',
  md: '--radius-md',
  lg: '--radius-lg',
} as const;

/**
 * Transition tokens
 */
export const transitionTokens = {
  default: '--transition',
  fast: '--transition-fast',
  slow: '--transition-slow',
} as const;

/**
 * Pattern tokens - phi-based design patterns
 */
export const patternTokens = {
  phiLineWidth: '--phi-line-width',
  phiLineOpacity: '--phi-line-opacity',
  phiTangentRadius: '--phi-tangent-radius',
  phiTangentOpacity: '--phi-tangent-opacity',
  phiLateralPositionV: '--phi-lateral-position-v',
  phiLateralPositionH: '--phi-lateral-position-h',
  phiLateralOpacity: '--phi-lateral-opacity',
  phiAzimuth1: '--phi-azimuth-1',
  phiAzimuth2: '--phi-azimuth-2',
  phiAzimuth3: '--phi-azimuth-3',
  phiAzimuth4: '--phi-azimuth-4',
  phiAzimuthOpacity: '--phi-azimuth-opacity',
  phiRatio: '--phi-ratio',
  phiRatioInv: '--phi-ratio-inv',
  phiSpiral1: '--phi-spiral-1',
  phiSpiral2: '--phi-spiral-2',
  phiSpiral3: '--phi-spiral-3',
  phiSpiral4: '--phi-spiral-4',
  phiSpiral5: '--phi-spiral-5',
} as const;

/**
 * Component tokens - specific to components
 */
export const componentTokens = {
  cardPadding: '--card-padding',
  cardPaddingSm: '--card-padding-sm',
  cardPaddingLg: '--card-padding-lg',
  cardPaddingXl: '--card-padding-xl',
  cardGap: '--card-gap',
  cardBorderRadius: '--card-border-radius',
  cardShadow: '--card-shadow',
  cardShadowHover: '--card-shadow-hover',
  formPadding: '--form-padding',
  formGap: '--form-gap',
  formInputPadding: '--form-input-padding',
  formBorderRadius: '--form-border-radius',
  formBorderColor: '--form-border-color',
  formBg: '--form-bg',
  headerPadding: '--header-padding',
  headerLogoSize: '--header-logo-size',
  footerPadding: '--footer-padding',
  footerGap: '--footer-gap',
  footerLogoSize: '--footer-logo-size',
  heroPadding: '--hero-padding',
  heroGap: '--hero-gap',
  heroTitleSize: '--hero-title-size',
  heroSubtitleSize: '--hero-subtitle-size',
  gridGap: '--grid-gap',
  gridGapSm: '--grid-gap-sm',
  gridGapLg: '--grid-gap-lg',
  btnSm: '--btn-sm',
  btnMd: '--btn-md',
  btnLg: '--btn-lg',
  iconSm: '--icon-sm',
  iconMd: '--icon-md',
  iconLg: '--icon-lg',
  iconXl: '--icon-xl',
} as const;

/**
 * All tokens combined
 */
export const allTokens = {
  ...baseTokens,
  ...spacingTokens,
  ...typographyTokens,
  ...colorTokens,
  ...opacityTokens,
  ...shadowTokens,
  ...borderRadiusTokens,
  ...transitionTokens,
  ...patternTokens,
  ...componentTokens,
} as const;

/**
 * Token categories for organization
 */
export const tokenCategories: TokenCategory = {
  base: Object.values(baseTokens),
  spacing: Object.values(spacingTokens),
  typography: Object.values(typographyTokens),
  color: Object.values(colorTokens),
  opacity: Object.values(opacityTokens),
  shadow: Object.values(shadowTokens),
  borderRadius: Object.values(borderRadiusTokens),
  transition: Object.values(transitionTokens),
  pattern: Object.values(patternTokens),
  component: Object.values(componentTokens),
};

/**
 * Get token value by name
 */
export function getToken(tokenName: string): string {
  return `var(${tokenName})`;
}

/**
 * Get all tokens for a category
 */
export function getTokensByCategory(category: keyof TokenCategory): string[] {
  return tokenCategories[category];
}

/**
 * Check if a token exists
 */
export function hasToken(tokenName: string): boolean {
  return Object.values(allTokens).includes(tokenName as any);
}

/**
 * Design block to token mapping
 * Maps design block visual properties to actual CSS tokens
 */
export const designBlockTokenMap: Record<string, string[]> = {
  'hero': [
    spacingTokens['5xl'],
    spacingTokens['6xl'],
    typographyTokens.h1,
    typographyTokens.xlPractical,
    colorTokens.primary,
    colorTokens.primaryDark,
    patternTokens.phiAzimuth1,
    patternTokens.phiAzimuth2,
  ],
  'card': [
    componentTokens.cardPadding,
    componentTokens.cardBorderRadius,
    componentTokens.cardShadow,
    typographyTokens.lgPractical,
    typographyTokens.base,
    colorTokens.primary,
    colorTokens.surfaceElevated,
    colorTokens.primaryUltraLight,
  ],
  'card-grid': [
    componentTokens.gridGap,
    spacingTokens.xl,
    spacingTokens['2xl'],
    patternTokens.phiAzimuth1,
    patternTokens.phiAzimuth2,
    patternTokens.phiAzimuth4,
  ],
  'semantic-text': [
    typographyTokens.base,
    colorTokens.primary,
    colorTokens.primaryDark,
    colorTokens.textPrimary,
    colorTokens.textSecondary,
  ],
  'inquiry-form': [
    componentTokens.formPadding,
    componentTokens.formGap,
    componentTokens.formBg,
    colorTokens.calm,
    colorTokens.calmLight,
    patternTokens.phiAzimuth3,
  ],
  'header': [
    componentTokens.headerPadding,
    componentTokens.headerLogoSize,
    colorTokens.primary,
    colorTokens.primaryUltraLight,
    colorTokens.surfaceElevated,
    patternTokens.phiAzimuth1,
  ],
  'footer': [
    componentTokens.footerPadding,
    componentTokens.footerGap,
    componentTokens.footerLogoSize,
    colorTokens.primary,
    colorTokens.darkSurface,
    patternTokens.phiAzimuth2,
  ],
};

/**
 * Get tokens for a design block
 */
export function getTokensForBlock(blockId: string): string[] {
  return designBlockTokenMap[blockId] || [];
}


