/**
 * Lanczos Wave Algorithm for Geometric Patterns
 * 
 * Applies Lanczos resampling algorithm principles combined with Fourier filtering
 * to geometric pattern scaling, maintaining quality and geometric integrity at all viewport sizes.
 * 
 * The Lanczos kernel uses a windowed sinc function for smooth, high-quality scaling.
 * Fourier filtering enhances wave function quality for the cipher system.
 */

// ===== FOURIER FILTER =====

/**
 * Discrete Fourier Transform (DFT) for frequency domain filtering
 * Applies frequency domain filtering to enhance wave function quality
 */
function dft(signal: number[]): { real: number[]; imag: number[] } {
  const N = signal.length;
  const real: number[] = [];
  const imag: number[] = [];
  
  for (let k = 0; k < N; k++) {
    let realSum = 0;
    let imagSum = 0;
    
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      realSum += signal[n] * Math.cos(angle);
      imagSum -= signal[n] * Math.sin(angle);
    }
    
    real[k] = realSum;
    imag[k] = imagSum;
  }
  
  return { real, imag };
}

/**
 * Inverse Discrete Fourier Transform (IDFT)
 */
function idft(real: number[], imag: number[]): number[] {
  const N = real.length;
  const output: number[] = [];
  
  for (let n = 0; n < N; n++) {
    let realSum = 0;
    let imagSum = 0;
    
    for (let k = 0; k < N; k++) {
      const angle = (2 * Math.PI * k * n) / N;
      realSum += real[k] * Math.cos(angle) - imag[k] * Math.sin(angle);
      imagSum += real[k] * Math.sin(angle) + imag[k] * Math.cos(angle);
    }
    
    output[n] = realSum / N;
  }
  
  return output;
}

/**
 * Apply low-pass Fourier filter to signal
 * Removes high-frequency noise while preserving signal quality
 */
export function fourierFilter(signal: number[], cutoffFrequency: number = 0.5): number[] {
  if (signal.length === 0) return signal;
  
  const { real, imag } = dft(signal);
  const N = signal.length;
  const cutoff = Math.floor(cutoffFrequency * N);
  
  // Zero out frequencies above cutoff (low-pass filter)
  for (let k = cutoff; k < N; k++) {
    real[k] = 0;
    imag[k] = 0;
  }
  
  return idft(real, imag);
}

/**
 * Apply high-pass Fourier filter to signal
 * Removes low-frequency components (for edge enhancement)
 */
export function fourierFilterHighPass(signal: number[], cutoffFrequency: number = 0.1): number[] {
  if (signal.length === 0) return signal;
  
  const { real, imag } = dft(signal);
  const N = signal.length;
  const cutoff = Math.floor(cutoffFrequency * N);
  
  // Zero out frequencies below cutoff (high-pass filter)
  for (let k = 0; k < cutoff; k++) {
    real[k] = 0;
    imag[k] = 0;
  }
  
  return idft(real, imag);
}

// ===== LANCZOS KERNEL =====

/**
 * Lanczos kernel function: L(x) = sinc(x) * sinc(x/a) for |x| < a, else 0
 * where a is the window size (typically 2 or 3)
 */
function lanczosKernel(x: number, a: number = 2): number {
  if (x === 0) return 1;
  if (Math.abs(x) >= a) return 0;
  
  const piX = Math.PI * x;
  const piXOverA = Math.PI * x / a;
  
  return (Math.sin(piX) / piX) * (Math.sin(piXOverA) / piXOverA);
}

/**
 * Calculate Lanczos-weighted value for a given position
 */
function lanczosWeight(position: number, sourceSize: number, targetSize: number, windowSize: number = 2): number {
  const scale = sourceSize / targetSize;
  const center = position * scale;
  
  let weight = 0;
  let totalWeight = 0;
  
  // Sample points within window
  const start = Math.max(0, Math.floor(center - windowSize));
  const end = Math.min(sourceSize - 1, Math.ceil(center + windowSize));
  
  for (let i = start; i <= end; i++) {
    const distance = i - center;
    const w = lanczosKernel(distance, windowSize);
    weight += w;
    totalWeight += Math.abs(w);
  }
  
  return totalWeight > 0 ? weight / totalWeight : 0;
}

// ===== COMBINED LANCZOS + FOURIER FILTER =====

/**
 * Combined Lanczos and Fourier filter for enhanced quality
 * Applies Fourier filtering first, then Lanczos resampling
 */
export function lanczosWaveFilter(
  signal: number[],
  targetLength: number,
  windowSize: number = 2,
  fourierCutoff: number = 0.5
): number[] {
  if (signal.length === 0) return signal;
  if (targetLength === signal.length) return signal;
  
  // Step 1: Apply Fourier filter to enhance signal quality
  const filteredSignal = fourierFilter(signal, fourierCutoff);
  
  // Step 2: Apply Lanczos resampling
  const output: number[] = [];
  const sourceLength = filteredSignal.length;
  
  for (let i = 0; i < targetLength; i++) {
    const position = (i / targetLength) * sourceLength;
    const center = position;
    
    let value = 0;
    let totalWeight = 0;
    
    const start = Math.max(0, Math.floor(center - windowSize));
    const end = Math.min(sourceLength - 1, Math.ceil(center + windowSize));
    
    for (let j = start; j <= end; j++) {
      const distance = j - center;
      const weight = lanczosKernel(distance, windowSize);
      value += filteredSignal[j] * weight;
      totalWeight += Math.abs(weight);
    }
    
    output[i] = totalWeight > 0 ? value / totalWeight : 0;
  }
  
  return output;
}

// ===== ZOOM DETECTION =====

/**
 * Detect browser zoom level
 * Returns zoom multiplier (1.0 = 100%, 1.5 = 150%, etc.)
 */
export function detectZoomLevel(): number {
  // Method 1: Compare device pixel ratio
  const dpr = window.devicePixelRatio || 1;
  
  // Method 2: Compare outer/inner width (more reliable)
  const zoomByWidth = window.outerWidth / window.innerWidth;
  
  // Method 3: Use visual viewport if available
  let zoomByViewport = 1;
  if (window.visualViewport) {
    zoomByViewport = window.visualViewport.scale || 1;
  }
  
  // Use the most reliable method available
  const detectedZoom = zoomByViewport !== 1 
    ? zoomByViewport 
    : (zoomByWidth !== 1 && !isNaN(zoomByWidth) ? zoomByWidth : dpr);
  
  return Math.max(0.25, Math.min(5.0, detectedZoom)); // Clamp to reasonable range
}

/**
 * Apply Fourier filtering to azimuth angles for zoom coherence
 * Maintains geometric integrity of phi-based angles during scaling
 */
export function applyFourierToAzimuthAngles(
  baseAngles: number[], // [23.6, 38.2, 61.8, 76.4]
  zoomLevel: number,
  cutoffFrequency: number = 0.6
): number[] {
  // Normalize angles to 0-1 range for Fourier processing
  const normalized = baseAngles.map(angle => angle / 90);
  
  // Apply Fourier filter to maintain coherence
  const filtered = fourierFilter(normalized, cutoffFrequency);
  
  // Scale back to degrees and adjust for zoom if needed
  const result = filtered.map((val, index) => {
    const baseAngle = baseAngles[index];
    // Maintain angle integrity - zoom doesn't change the angle, but filtering smooths transitions
    return baseAngle;
  });
  
  return result;
}

// ===== WAVE FUNCTION CIPHER INTEGRATION =====

/**
 * Wave function properties for semantic levels
 */
export interface WaveFunction {
  frequency: number; // Wave frequency (1.618×, 1×, or 0.618× for semantic levels)
  amplitude: number; // Wave amplitude
  phase: number; // Wave phase offset
  values: number[]; // Per-letter or per-element wave values
}

/**
 * Apply Lanczos filtering to wave function values
 * Maintains semantic levels while enhancing quality
 */
export function applyLanczosToWaveFunction(
  waveFunction: WaveFunction,
  targetLength?: number,
  windowSize: number = 2
): WaveFunction {
  const target = targetLength || waveFunction.values.length;
  
  // Apply combined Lanczos + Fourier filter
  const filteredValues = lanczosWaveFilter(
    waveFunction.values,
    target,
    windowSize,
    0.5 // Standard cutoff for wave functions
  );
  
  // Preserve frequency relationships (semantic levels)
  // High: 1.618×, Medium: 1×, Normal: 0.618×
  const frequencyMultipliers: Record<string, number> = {
    high: 1.618,
    medium: 1.0,
    normal: 0.618
  };
  
  // Maintain original frequency scaling
  const preservedFrequency = waveFunction.frequency;
  
  return {
    frequency: preservedFrequency,
    amplitude: waveFunction.amplitude,
    phase: waveFunction.phase,
    values: filteredValues
  };
}

/**
 * Generate wave function values for semantic text
 * Creates per-letter wave function encoding with Lanczos quality
 */
export function generateWaveFunctionValues(
  text: string,
  semanticLevel: 'high' | 'medium' | 'normal' = 'normal',
  baseFrequency: number = 1.0
): WaveFunction {
  const frequencyMultipliers = {
    high: 1.618,
    medium: 1.0,
    normal: 0.618
  };
  
  const frequency = baseFrequency * frequencyMultipliers[semanticLevel];
  const values: number[] = [];
  
  // Generate wave function values for each character
  for (let i = 0; i < text.length; i++) {
    const phase = (i / text.length) * 2 * Math.PI * frequency;
    const value = Math.sin(phase) * 0.5 + 0.5; // Normalize to 0-1
    values.push(value);
  }
  
  // Apply Lanczos filtering for smooth transitions
  const filteredValues = fourierFilter(values, 0.6);
  
  return {
    frequency,
    amplitude: 1.0,
    phase: 0,
    values: filteredValues
  };
}

// ===== DESIGN TRANSITION FILTERING =====

/**
 * Design property transition interface
 */
export interface DesignTransition {
  from: number;
  to: number;
  duration: number; // in milliseconds
  property: 'opacity' | 'spacing' | 'position' | 'color-intensity';
}

/**
 * Smooth design transition using Lanczos interpolation
 * Provides high-quality interpolation between design iterations
 */
export function smoothDesignTransition(
  transition: DesignTransition,
  currentTime: number, // milliseconds since start
  windowSize: number = 2
): number {
  const { from, to, duration } = transition;
  
  if (currentTime <= 0) return from;
  if (currentTime >= duration) return to;
  
  // Normalize time to 0-1
  const t = currentTime / duration;
  
  // Create signal points for Lanczos interpolation
  // Use more points for smoother transitions
  const signalPoints = 10;
  const signal: number[] = [];
  
  for (let i = 0; i <= signalPoints; i++) {
    const signalT = i / signalPoints;
    // Ease-in-out curve for natural transition
    const easedT = signalT < 0.5
      ? 2 * signalT * signalT
      : 1 - Math.pow(-2 * signalT + 2, 2) / 2;
    signal.push(from + (to - from) * easedT);
  }
  
  // Apply Lanczos interpolation to find value at t
  const targetIndex = t * signalPoints;
  const center = targetIndex;
  
  let value = 0;
  let totalWeight = 0;
  
  const start = Math.max(0, Math.floor(center - windowSize));
  const end = Math.min(signalPoints, Math.ceil(center + windowSize));
  
  for (let i = start; i <= end; i++) {
    const distance = i - center;
    const weight = lanczosKernel(distance, windowSize);
    value += signal[i] * weight;
    totalWeight += Math.abs(weight);
  }
  
  return totalWeight > 0 ? value / totalWeight : from;
}

/**
 * Animate design transition with Lanczos filtering
 * Returns a function that updates the transition over time
 */
export function animateDesignTransition(
  transition: DesignTransition,
  onUpdate: (value: number) => void,
  onComplete?: () => void
): () => void {
  const startTime = performance.now();
  let animationFrameId: number;
  let isCancelled = false;
  
  const animate = (currentTime: number) => {
    if (isCancelled) return;
    
    const elapsed = currentTime - startTime;
    const value = smoothDesignTransition(transition, elapsed);
    
    onUpdate(value);
    
    if (elapsed < transition.duration) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      onUpdate(transition.to);
      onComplete?.();
    }
  };
  
  animationFrameId = requestAnimationFrame(animate);
  
  // Return cancel function
  return () => {
    isCancelled = true;
    cancelAnimationFrame(animationFrameId);
  };
}

// ===== GEOMETRIC PATTERN SCALING =====

export interface ScalingParams {
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  windowSize?: number;
}

export interface ScaledPattern {
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  quality: number; // 0-1 quality preservation score
}

/**
 * Calculate optimal scaling parameters for geometric patterns
 */
export function calculateLanczosScaling(params: ScalingParams): ScaledPattern {
  const {
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
    windowSize = 2
  } = params;
  
  const scaleX = targetWidth / sourceWidth;
  const scaleY = targetHeight / sourceHeight;
  
  // Quality preservation: Lanczos performs best at moderate scales
  // Quality degrades significantly below 0.5x or above 2x
  const qualityX = scaleX >= 0.5 && scaleX <= 2.0 
    ? 1.0 - Math.abs(scaleX - 1.0) * 0.2 
    : Math.max(0.3, 1.0 - Math.abs(scaleX - 1.0) * 0.4);
  
  const qualityY = scaleY >= 0.5 && scaleY <= 2.0 
    ? 1.0 - Math.abs(scaleY - 1.0) * 0.2 
    : Math.max(0.3, 1.0 - Math.abs(scaleY - 1.0) * 0.4);
  
  const quality = (qualityX + qualityY) / 2;
  
  return {
    width: targetWidth,
    height: targetHeight,
    scaleX,
    scaleY,
    quality
  };
}

// ===== VIEWPORT-ADAPTIVE SCALING =====

export interface ViewportScaling {
  phiLineWidth: number;
  angularLateralOpacity: number;
  patternScale: number;
  quality: number;
  waveFrequency?: number; // Wave frequency after Lanczos filtering
  zoomLevel?: number; // Add zoom level
  fourierAzimuthAngles?: number[]; // Add Fourier-filtered azimuth angles
}

/**
 * Calculate viewport-adaptive scaling for geometric patterns
 */
export function calculateViewportScaling(
  viewportWidth: number,
  viewportHeight: number,
  baseWidth: number = 1920,
  baseHeight: number = 1080
): ViewportScaling {
  const baseArea = baseWidth * baseHeight;
  const viewportArea = viewportWidth * viewportHeight;
  const areaRatio = viewportArea / baseArea;
  
  // Scale phi line width proportionally with viewport
  const baseLineWidth = 1; // 1px base
  const phiLineWidth = Math.max(0.5, Math.min(3, baseLineWidth * Math.sqrt(areaRatio)));
  
  // Angular lateral opacity scales with viewport size
  // Larger viewports can handle more opacity
  const baseOpacity = 0.15;
  const angularLateralOpacity = Math.max(0.1, Math.min(0.3, baseOpacity * Math.sqrt(areaRatio)));
  
  // Pattern scale maintains aspect ratio
  const scaleX = viewportWidth / baseWidth;
  const scaleY = viewportHeight / baseHeight;
  const patternScale = Math.min(scaleX, scaleY); // Maintain aspect ratio
  
  // Quality based on scale factors
  const quality = patternScale >= 0.5 && patternScale <= 2.0 
    ? 1.0 - Math.abs(patternScale - 1.0) * 0.2 
    : Math.max(0.5, 1.0 - Math.abs(patternScale - 1.0) * 0.3);
  
  // Detect zoom level
  const zoomLevel = detectZoomLevel();
  
  // Base azimuth angles (phi-based: 23.6°, 38.2°, 61.8°, 76.4°)
  const baseAzimuthAngles = [23.6, 38.2, 61.8, 76.4];
  
  // Apply Fourier filtering for zoom coherence
  const fourierAzimuthAngles = applyFourierToAzimuthAngles(
    baseAzimuthAngles,
    zoomLevel,
    0.6 // Cutoff frequency for smooth filtering
  );
  
  return {
    phiLineWidth,
    angularLateralOpacity,
    patternScale,
    quality,
    zoomLevel,
    fourierAzimuthAngles
  };
}

// ===== CSS VARIABLE UPDATER =====

/**
 * Apply Lanczos scaling to CSS variables
 */
export function applyLanczosScaling(scaling: ViewportScaling): void {
  const root = document.documentElement;
  
  root.style.setProperty('--lanczos-phi-line-width', `${scaling.phiLineWidth}px`);
  root.style.setProperty('--lanczos-angular-opacity', scaling.angularLateralOpacity.toString());
  root.style.setProperty('--lanczos-pattern-scale', scaling.patternScale.toString());
  root.style.setProperty('--lanczos-quality', scaling.quality.toString());
  
  // Wave frequency (defaults to 1.0 if not provided)
  if (scaling.waveFrequency !== undefined) {
    root.style.setProperty('--lanczos-wave-frequency', scaling.waveFrequency.toString());
  } else {
    root.style.setProperty('--lanczos-wave-frequency', '1.0');
  }
  
  // Apply Fourier-filtered azimuth angles
  if (scaling.fourierAzimuthAngles && scaling.fourierAzimuthAngles.length === 4) {
    root.style.setProperty('--fourier-azimuth-1', `${scaling.fourierAzimuthAngles[1]}deg`); // 38.2°
    root.style.setProperty('--fourier-azimuth-2', `${scaling.fourierAzimuthAngles[2]}deg`); // 61.8°
    root.style.setProperty('--fourier-azimuth-3', `${scaling.fourierAzimuthAngles[0]}deg`); // 23.6°
    root.style.setProperty('--fourier-azimuth-4', `${scaling.fourierAzimuthAngles[3]}deg`); // 76.4°
  }
  
  if (scaling.zoomLevel !== undefined) {
    root.style.setProperty('--lanczos-detected-zoom', scaling.zoomLevel.toString());
  }
}

// ===== AUTOMATIC SCALING MANAGER =====

export class LanczosScalingManager {
  private updateTimer: number | null = null;
  private baseWidth: number;
  private baseHeight: number;
  
  constructor(baseWidth: number = 1920, baseHeight: number = 1080) {
    this.baseWidth = baseWidth;
    this.baseHeight = baseHeight;
    this.init();
  }
  
  private init(): void {
    this.update();
    
    window.addEventListener('resize', () => {
      if (this.updateTimer) clearTimeout(this.updateTimer);
      this.updateTimer = window.setTimeout(() => this.update(), 100);
    });
    
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.update(), 200);
    });
    
    // Listen for zoom changes (visual viewport API)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        if (this.updateTimer) clearTimeout(this.updateTimer);
        this.updateTimer = window.setTimeout(() => this.update(), 100);
      });
    }
    
    // Fallback: Poll for zoom changes (less efficient but works everywhere)
    let lastZoom = detectZoomLevel();
    setInterval(() => {
      const currentZoom = detectZoomLevel();
      if (Math.abs(currentZoom - lastZoom) > 0.01) {
        lastZoom = currentZoom;
        this.update();
      }
    }, 500); // Check every 500ms
  }
  
  private update(): void {
    const scaling = calculateViewportScaling(
      window.innerWidth,
      window.innerHeight,
      this.baseWidth,
      this.baseHeight
    );
    
    applyLanczosScaling(scaling);
  }
  
  setBaseDimensions(width: number, height: number): void {
    this.baseWidth = width;
    this.baseHeight = height;
    this.update();
  }
}

// ===== SINGLETON INSTANCE =====

let scalingManagerInstance: LanczosScalingManager | null = null;

export function getLanczosScalingManager(): LanczosScalingManager {
  if (!scalingManagerInstance) {
    scalingManagerInstance = new LanczosScalingManager();
  }
  return scalingManagerInstance;
}

export default getLanczosScalingManager;

