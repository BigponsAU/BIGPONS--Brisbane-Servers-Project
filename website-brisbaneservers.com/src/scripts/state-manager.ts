/**
 * Flower-of-Life Semantic Landscape: Polymorphic State Management System
 * 
 * A living, self-describing state system where every state is information
 * that adapts to viewport framing. States are granular data points on a
 * 3D terrain bounded by sacred geometry (19-circle Flower of Life).
 */

// ===== STATE TYPES =====

export type ViewportState = 'mobile' | 'tablet' | 'desktop' | 'ultra-wide';
export type SymmetryMode = 'bilateral' | 'radial' | 'asymmetric';
export type HarmonyLevel = 'high' | 'medium' | 'low';
export type InformationDensity = 'sparse' | 'balanced' | 'dense';
export type DisplayMode = 'minimal' | 'standard' | 'enhanced';
export type InteractionState = 'idle' | 'hover' | 'focus' | 'active' | 'expanded' | 'collapsed';

export interface ViewportFrame {
  width: number;
  height: number;
  aspectRatio: number;
  pixelRatio: number;
}

export interface GeometricState {
  symmetryMode: SymmetryMode;
  harmonyLevel: HarmonyLevel;
  phiRatio: number;
  sqrt2Ratio: number;
  combinedRatio: number;
}

export interface InformationState {
  density: InformationDensity;
  semanticLevel: 'high' | 'medium' | 'normal';
  displayMode: DisplayMode;
  contentScale: number;
}

export interface InteractionStateMap {
  [elementId: string]: InteractionState;
}

export interface AppState {
  viewport: ViewportState;
  frame: ViewportFrame;
  geometric: GeometricState;
  information: InformationState;
  interactions: InteractionStateMap;
  timestamp: number;
}

// ===== STATE CALCULATIONS =====

function calculateViewportState(frame: ViewportFrame): ViewportState {
  if (frame.width < 768) return 'mobile';
  if (frame.width < 1024) return 'tablet';
  if (frame.width < 1920) return 'desktop';
  return 'ultra-wide';
}

function calculateSymmetryMode(frame: ViewportFrame, harmonyLevel: HarmonyLevel): SymmetryMode {
  // Aspect ratio determines symmetry preference
  if (frame.aspectRatio > 2.0) return 'bilateral'; // Wide screens favor bilateral
  if (frame.aspectRatio < 0.8) return 'radial'; // Tall screens favor radial
  if (harmonyLevel === 'low') return 'asymmetric';
  return frame.aspectRatio > 1.5 ? 'bilateral' : 'radial';
}

function calculateHarmonyLevel(frame: ViewportFrame): HarmonyLevel {
  // Viewport proportions determine harmony
  const phi = 1.618;
  const ratio = frame.aspectRatio;
  
  // Check proximity to phi-based ratios
  const phiProximity = Math.abs(ratio - phi) / phi;
  const sqrt2Proximity = Math.abs(ratio - 1.414) / 1.414;
  
  if (phiProximity < 0.1 || sqrt2Proximity < 0.1) return 'high';
  if (phiProximity < 0.2 || sqrt2Proximity < 0.2) return 'medium';
  return 'low';
}

function calculateInformationDensity(frame: ViewportFrame, viewport: ViewportState): InformationDensity {
  const area = frame.width * frame.height;
  const thresholdSparse = 500000; // pixels
  const thresholdDense = 2000000; // pixels
  
  if (area < thresholdSparse) return 'sparse';
  if (area > thresholdDense) return 'dense';
  return 'balanced';
}

function calculateContentScale(frame: ViewportFrame, viewport: ViewportState): number {
  // Base scale on viewport size and pixel ratio
  const baseScale = Math.min(frame.width / 1920, frame.height / 1080);
  return Math.max(0.5, Math.min(1.5, baseScale * frame.pixelRatio));
}

// ===== STATE MANAGER CLASS =====

type StateObserver = (state: AppState) => void;
type StateSelector<T> = (state: AppState) => T;

export class StateManager {
  private state: AppState;
  private observers: Set<StateObserver> = new Set();
  private frameUpdateTimer: number | null = null;
  
  constructor() {
    const initialFrame = this.getCurrentFrame();
    const initialViewport = calculateViewportState(initialFrame);
    const initialHarmony = calculateHarmonyLevel(initialFrame);
    
    this.state = {
      viewport: initialViewport,
      frame: initialFrame,
      geometric: {
        symmetryMode: calculateSymmetryMode(initialFrame, initialHarmony),
        harmonyLevel: initialHarmony,
        phiRatio: 1.618,
        sqrt2Ratio: 1.414,
        combinedRatio: 1.618 * 1.414 // φ × √2
      },
      information: {
        density: calculateInformationDensity(initialFrame, initialViewport),
        semanticLevel: 'normal',
        displayMode: 'standard',
        contentScale: calculateContentScale(initialFrame, initialViewport)
      },
      interactions: {},
      timestamp: Date.now()
    };
    
    this.initFrameTracking();
  }
  
  private getCurrentFrame(): ViewportFrame {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      aspectRatio: window.innerWidth / window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1
    };
  }
  
  private initFrameTracking(): void {
    // Debounced frame updates
    const updateFrame = () => {
      const newFrame = this.getCurrentFrame();
      this.updateState({
        frame: newFrame,
        viewport: calculateViewportState(newFrame),
        geometric: {
          ...this.state.geometric,
          harmonyLevel: calculateHarmonyLevel(newFrame),
          symmetryMode: calculateSymmetryMode(newFrame, this.state.geometric.harmonyLevel)
        },
        information: {
          ...this.state.information,
          density: calculateInformationDensity(newFrame, this.state.viewport),
          contentScale: calculateContentScale(newFrame, this.state.viewport)
        },
        timestamp: Date.now()
      });
    };
    
    window.addEventListener('resize', () => {
      if (this.frameUpdateTimer) clearTimeout(this.frameUpdateTimer);
      this.frameUpdateTimer = window.setTimeout(updateFrame, 100);
    });
    
    window.addEventListener('orientationchange', () => {
      setTimeout(updateFrame, 200);
    });
  }
  
  private updateState(updates: Partial<AppState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyObservers();
    this.updateCSSVariables();
  }
  
  private updateCSSVariables(): void {
    const root = document.documentElement;
    const { geometric, information, viewport, frame } = this.state;
    
    // Geometric variables
    root.style.setProperty('--state-symmetry-mode', geometric.symmetryMode);
    root.style.setProperty('--state-harmony-level', geometric.harmonyLevel);
    root.style.setProperty('--state-phi-ratio', geometric.phiRatio.toString());
    root.style.setProperty('--state-sqrt2-ratio', geometric.sqrt2Ratio.toString());
    root.style.setProperty('--state-combined-ratio', geometric.combinedRatio.toString());
    
    // Information variables
    root.style.setProperty('--state-density', information.density);
    root.style.setProperty('--state-semantic-level', information.semanticLevel);
    root.style.setProperty('--state-display-mode', information.displayMode);
    root.style.setProperty('--state-content-scale', information.contentScale.toString());
    
    // Viewport variables
    root.style.setProperty('--state-viewport', viewport);
    root.style.setProperty('--state-aspect-ratio', frame.aspectRatio.toString());
  }
  
  // ===== PUBLIC API =====
  
  getState(): AppState {
    return { ...this.state };
  }
  
  select<T>(selector: StateSelector<T>): T {
    return selector(this.state);
  }
  
  subscribe(observer: StateObserver): () => void {
    this.observers.add(observer);
    // Immediately notify with current state
    observer(this.state);
    
    // Return unsubscribe function
    return () => {
      this.observers.delete(observer);
    };
  }
  
  setInteractionState(elementId: string, state: InteractionState): void {
    this.updateState({
      interactions: {
        ...this.state.interactions,
        [elementId]: state
      }
    });
  }
  
  getInteractionState(elementId: string): InteractionState {
    return this.state.interactions[elementId] || 'idle';
  }
  
  setInformationState(updates: Partial<InformationState>): void {
    this.updateState({
      information: {
        ...this.state.information,
        ...updates
      }
    });
  }
  
  setGeometricState(updates: Partial<GeometricState>): void {
    this.updateState({
      geometric: {
        ...this.state.geometric,
        ...updates
      }
    });
  }
  
  private notifyObservers(): void {
    this.observers.forEach(observer => {
      try {
        observer(this.state);
      } catch (error) {
        console.error('State observer error:', error);
      }
    });
  }
}

// ===== SINGLETON INSTANCE =====

let stateManagerInstance: StateManager | null = null;

export function getStateManager(): StateManager {
  if (!stateManagerInstance) {
    stateManagerInstance = new StateManager();
  }
  return stateManagerInstance;
}

// ===== POLYMORPHIC COMPONENT ADAPTERS =====

export interface ComponentStateAdapter<T> {
  adapt(state: AppState): T;
}

export function createStateAdapter<T>(
  adapter: ComponentStateAdapter<T>
): (state: AppState) => T {
  return (state: AppState) => adapter.adapt(state);
}

// ===== EXPORT FOR USE IN COMPONENTS =====

export default getStateManager;

