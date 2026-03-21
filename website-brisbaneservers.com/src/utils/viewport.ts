/**
 * Enhanced Viewport Utilities
 * 
 * Comprehensive viewport state detection for responsive components.
 * Provides viewport size categories, orientation, safe area insets, pixel ratio,
 * and event emitter for viewport changes.
 */

export type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'ultra-wide';
export type ViewportOrientation = 'portrait' | 'landscape';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ViewportInfo {
  width: number;
  height: number;
  size: ViewportSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isUltraWide: boolean;
  orientation: ViewportOrientation;
  aspectRatio: number;
  pixelRatio: number;
  safeAreaInsets: SafeAreaInsets;
}

/**
 * Get safe area insets (for devices with notches, etc.)
 */
function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined' || typeof CSS === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  // Get CSS environment variables for safe area insets
  const top = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10);
  const right = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10);
  const bottom = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10);
  const left = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10);

  return { top, right, bottom, left };
}

/**
 * Get current viewport information with enhanced features
 */
export function getViewportInfo(): ViewportInfo {
  if (typeof window === 'undefined') {
    // SSR fallback
    return {
      width: 1024,
      height: 768,
      size: 'desktop',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isUltraWide: false,
      orientation: 'landscape',
      aspectRatio: 1024 / 768,
      pixelRatio: 1,
      safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 }
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspectRatio = width / height;
  
  // Determine orientation
  const orientation: ViewportOrientation = width > height ? 'landscape' : 'portrait';
  
  // Get pixel ratio
  const pixelRatio = window.devicePixelRatio || 1;
  
  // Get safe area insets
  const safeAreaInsets = getSafeAreaInsets();
  
  // Determine size category
  let size: ViewportSize;
  if (width < 768) {
    size = 'mobile';
  } else if (width < 1024) {
    size = 'tablet';
  } else if (width < 1920) {
    size = 'desktop';
  } else {
    size = 'ultra-wide';
  }

  return {
    width,
    height,
    size,
    isMobile: size === 'mobile',
    isTablet: size === 'tablet',
    isDesktop: size === 'desktop',
    isUltraWide: size === 'ultra-wide',
    orientation,
    aspectRatio,
    pixelRatio,
    safeAreaInsets
  };
}

/**
 * Viewport Event Emitter
 * Allows multiple subscribers to viewport changes
 */
class ViewportEmitter {
  private listeners: Set<(info: ViewportInfo) => void> = new Set();
  private lastInfo: ViewportInfo | null = null;
  private resizeTimer: number | null = null;
  private orientationTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize.bind(this));
      window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
    }
  }

  private handleResize() {
    // Debounce resize events
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    
    this.resizeTimer = window.setTimeout(() => {
      this.emit();
    }, 150);
  }

  private handleOrientationChange() {
    // Delay to allow orientation to settle
    if (this.orientationTimer) {
      clearTimeout(this.orientationTimer);
    }
    
    this.orientationTimer = window.setTimeout(() => {
      this.emit();
    }, 300);
  }

  private emit() {
    const info = getViewportInfo();
    
    // Only emit if something meaningful changed
    if (!this.lastInfo || 
        this.lastInfo.size !== info.size ||
        this.lastInfo.orientation !== info.orientation ||
        Math.abs(this.lastInfo.width - info.width) > 50 ||
        Math.abs(this.lastInfo.height - info.height) > 50) {
      this.lastInfo = info;
      this.listeners.forEach(callback => callback(info));
    }
  }

  subscribe(callback: (info: ViewportInfo) => void): () => void {
    this.listeners.add(callback);
    // Emit immediately with current info
    if (typeof window !== 'undefined') {
      callback(getViewportInfo());
    }
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }
}

// Singleton instance
const viewportEmitter = typeof window !== 'undefined' ? new ViewportEmitter() : null;

/**
 * Subscribe to viewport changes with enhanced event emitter
 * Returns cleanup function to unsubscribe
 */
export function onViewportChange(callback: (info: ViewportInfo) => void): () => void {
  if (typeof window === 'undefined' || !viewportEmitter) {
    return () => {}; // No-op for SSR
  }

  return viewportEmitter.subscribe(callback);
}

/**
 * Check if viewport matches a size
 */
export function matchesViewport(size: ViewportSize | ViewportSize[]): boolean {
  const info = getViewportInfo();
  if (Array.isArray(size)) {
    return size.includes(info.size);
  }
  return info.size === size;
}

/**
 * Check if viewport is in portrait orientation
 */
export function isPortrait(): boolean {
  const info = getViewportInfo();
  return info.orientation === 'portrait';
}

/**
 * Check if viewport is in landscape orientation
 */
export function isLandscape(): boolean {
  const info = getViewportInfo();
  return info.orientation === 'landscape';
}

/**
 * Get current orientation
 */
export function getOrientation(): ViewportOrientation {
  const info = getViewportInfo();
  return info.orientation;
}

/**
 * Get current pixel ratio
 */
export function getPixelRatio(): number {
  const info = getViewportInfo();
  return info.pixelRatio;
}/**
 * Get safe area insets
 */
export function getSafeArea(): SafeAreaInsets {
  const info = getViewportInfo();
  return info.safeAreaInsets;
}
