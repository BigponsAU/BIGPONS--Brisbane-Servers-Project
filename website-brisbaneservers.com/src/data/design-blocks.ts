/**
 * DESIGN BLOCKS DATABASE
 * Vectorized catalog of all design blocks, components, patterns, and elements
 * Used for data extraction and building comprehensive web presence
 * All blocks use cipher system as foundation with wave function encoding
 */

export interface DesignBlock {
  id: string;
  type: 'component' | 'pattern' | 'layout' | 'element' | 'system';
  name: string;
  description: string;
  category: string;
  cipherProperties: {
    semanticLevel: 'high' | 'medium' | 'normal';
    waveFrequency: number;
    colorPsychology: string[];
    phiRelations: string[];
    azimuthAngles: number[];
  };
  visualProperties: {
    colors: string[];
    spacing: string[];
    typography: string[];
    transforms: string[];
  };
  symmetryHarmony?: {
    symmetryMode: 'bilateral' | 'radial' | 'asymmetric';
    harmonyLevel: 'high' | 'medium' | 'low';
    sqrt2Relations?: string[];
    diagonalAngles?: number[];
  };
  permutations: string[];
  dependencies: string[];
  usage: string[];
}

export interface BlockPermutation {
  id: string;
  blockIds: string[];
  layout: 'grid' | 'stack' | 'flow' | 'radial' | 'asymmetric' | 'diagonal' | 'masonry';
  azimuth: number;
  phiRatio: number;
  cipherIntensity: number;
}

// === COMPONENT BLOCKS ===
export const componentBlocks: DesignBlock[] = [
  {
    id: 'hero',
    type: 'component',
    name: 'Hero Section',
    description: 'Primary landing section with title, subtitle, and CTA',
    category: 'layout',
    cipherProperties: {
      semanticLevel: 'high',
      waveFrequency: 1.618,
      colorPsychology: ['trust', 'authority'],
      phiRelations: ['phi-ratio', 'phi-spiral'],
      azimuthAngles: [38.2, 61.8]
    },
    visualProperties: {
      colors: ['primary', 'primary-dark'],
      spacing: ['space-5xl', 'space-6xl'],
      typography: ['font-h1', 'text-xl-practical'],
      transforms: ['phi-tangent', 'phi-lateral-angular-1']
    },
    symmetryHarmony: {
      symmetryMode: 'bilateral',
      harmonyLevel: 'high',
      sqrt2Relations: ['sqrt2-ratio'],
      diagonalAngles: [83.2, 106.8]
    },
    permutations: ['hero-centered', 'hero-asymmetric', 'hero-diagonal'],
    dependencies: ['semantic-text'],
    usage: ['index', 'about', 'services', 'resources', 'projects']
  },
  {
    id: 'card',
    type: 'component',
    name: 'Card Component',
    description: 'Content card with title, description, icon, and optional link',
    category: 'content',
    cipherProperties: {
      semanticLevel: 'medium',
      waveFrequency: 1.0,
      colorPsychology: ['trust', 'clarity'],
      phiRelations: ['phi-ratio-inv', 'phi-sqrt'],
      azimuthAngles: [23.6, 38.2]
    },
    visualProperties: {
      colors: ['primary', 'surface-elevated', 'primary-ultra-light'],
      spacing: ['space-xl', 'space-2xl'],
      typography: ['text-lg-practical', 'text-base'],
      transforms: ['phi-tangent', 'angular-hover']
    },
    symmetryHarmony: {
      symmetryMode: 'asymmetric',
      harmonyLevel: 'medium',
      sqrt2Relations: ['space-diag-lg'],
      diagonalAngles: [68.6]
    },
    permutations: ['card-standard', 'card-primary', 'card-evidence'],
    dependencies: ['semantic-text', 'phi-lines'],
    usage: ['all-pages']
  },
  {
    id: 'card-grid',
    type: 'component',
    name: 'Card Grid',
    description: 'Responsive grid layout for cards with phi-based spacing',
    category: 'layout',
    cipherProperties: {
      semanticLevel: 'medium',
      waveFrequency: 0.618,
      colorPsychology: ['organization', 'clarity'],
      phiRelations: ['phi-grid-cell', 'phi-ratio'],
      azimuthAngles: [38.2, 61.8, 76.4]
    },
    visualProperties: {
      colors: ['bg-accent', 'surface'],
      spacing: ['space-xl', 'space-2xl'],
      typography: [],
      transforms: ['phi-line-vertical', 'phi-lateral-horizontal']
    },
    permutations: ['grid-standard', 'grid-masonry', 'grid-asymmetric', 'grid-radial'],
    dependencies: ['card'],
    usage: ['all-pages']
  },
  {
    id: 'semantic-text',
    type: 'component',
    name: 'Semantic Text',
    description: 'Per-letter semantic styling with wave function cipher encoding',
    category: 'typography',
    cipherProperties: {
      semanticLevel: 'high',
      waveFrequency: 1.618,
      colorPsychology: ['meaning', 'emphasis'],
      phiRelations: ['phi-phase', 'phi-spiral'],
      azimuthAngles: [38.2, 61.8, 23.6, 76.4]
    },
    visualProperties: {
      colors: ['primary', 'primary-dark'],
      spacing: ['wave-spacing'],
      typography: ['all-scales'],
      transforms: ['wave-opacity', 'wave-position', 'wave-semantic']
    },
    permutations: ['semantic-high', 'semantic-medium', 'semantic-normal', 'semantic-parent', 'semantic-child'],
    dependencies: [],
    usage: ['all-text-elements']
  },
  {
    id: 'inquiry-form',
    type: 'component',
    name: 'Inquiry Form',
    description: 'Contact form with calming blue color psychology',
    category: 'interaction',
    cipherProperties: {
      semanticLevel: 'medium',
      waveFrequency: 0.618,
      colorPsychology: ['calm', 'trust'],
      phiRelations: ['phi-ratio', 'phi-lateral-angular-3'],
      azimuthAngles: [23.6]
    },
    visualProperties: {
      colors: ['calm', 'calm-light', 'surface-elevated'],
      spacing: ['space-2xl', 'space-3xl'],
      typography: ['text-base', 'text-sm'],
      transforms: ['phi-lateral-angular-3', 'bg-pattern-phi-radial']
    },
    permutations: ['form-standard', 'form-minimal', 'form-extended'],
    dependencies: ['semantic-text'],
    usage: ['all-pages']
  },
  {
    id: 'header',
    type: 'component',
    name: 'Header Navigation',
    description: 'Fixed header with navigation and semantic text',
    category: 'navigation',
    cipherProperties: {
      semanticLevel: 'high',
      waveFrequency: 1.0,
      colorPsychology: ['authority', 'trust'],
      phiRelations: ['phi-ratio', 'phi-lateral-angular-1'],
      azimuthAngles: [38.2]
    },
    visualProperties: {
      colors: ['primary', 'primary-ultra-light', 'surface-elevated'],
      spacing: ['space-md', 'space-lg'],
      typography: ['text-lg-practical'],
      transforms: ['phi-lateral-angular-1', 'header-angular']
    },
    permutations: ['header-standard', 'header-minimal', 'header-extended'],
    dependencies: ['semantic-text'],
    usage: ['all-pages']
  },
  {
    id: 'footer',
    type: 'component',
    name: 'Footer',
    description: 'Site footer with links, contact info, and patterns',
    category: 'navigation',
    cipherProperties: {
      semanticLevel: 'normal',
      waveFrequency: 0.618,
      colorPsychology: ['stability', 'completeness'],
      phiRelations: ['phi-grid', 'phi-lateral-angular-2'],
      azimuthAngles: [61.8]
    },
    visualProperties: {
      colors: ['dark-surface', 'primary'],
      spacing: ['space-xl', 'space-2xl'],
      typography: ['text-sm', 'text-base'],
      transforms: ['bg-pattern-phi-grid', 'phi-lateral-angular-2']
    },
    permutations: ['footer-standard', 'footer-minimal', 'footer-extended'],
    dependencies: ['semantic-text'],
    usage: ['all-pages']
  },
  {
    id: 'search-bar',
    type: 'component',
    name: 'Search Bar',
    description: 'Search input with phi-based positioning',
    category: 'interaction',
    cipherProperties: {
      semanticLevel: 'medium',
      waveFrequency: 1.0,
      colorPsychology: ['discovery', 'access'],
      phiRelations: ['phi-ratio'],
      azimuthAngles: []
    },
    visualProperties: {
      colors: ['primary', 'surface-elevated'],
      spacing: ['space-lg', 'space-xl'],
      typography: ['text-base'],
      transforms: []
    },
    permutations: ['search-standard', 'search-minimal'],
    dependencies: [],
    usage: ['index', 'resources']
  },
  {
    id: 'breadcrumbs',
    type: 'component',
    name: 'Breadcrumbs',
    description: 'Navigation breadcrumb trail',
    category: 'navigation',
    cipherProperties: {
      semanticLevel: 'normal',
      waveFrequency: 0.618,
      colorPsychology: ['guidance', 'orientation'],
      phiRelations: ['phi-ratio-inv'],
      azimuthAngles: []
    },
    visualProperties: {
      colors: ['primary', 'primary-ultra-light'],
      spacing: ['space-lg'],
      typography: ['text-sm'],
      transforms: []
    },
    permutations: ['breadcrumbs-standard'],
    dependencies: [],
    usage: ['resources', 'projects']
  },
  {
    id: 'industry-filters',
    type: 'component',
    name: 'Industry Filters',
    description: 'Filter buttons for industry selection',
    category: 'interaction',
    cipherProperties: {
      semanticLevel: 'medium',
      waveFrequency: 1.0,
      colorPsychology: ['organization', 'selection'],
      phiRelations: ['phi-ratio'],
      azimuthAngles: []
    },
    visualProperties: {
      colors: ['primary', 'surface-elevated'],
      spacing: ['space-md', 'space-lg'],
      typography: ['text-base', 'text-sm'],
      transforms: []
    },
    permutations: ['filters-standard', 'filters-pills'],
    dependencies: [],
    usage: ['resources', 'projects']
  }
];

// === PATTERN BLOCKS ===
export const patternBlocks: DesignBlock[] = [
  {
    id: 'phi-line-vertical',
    type: 'pattern',
    name: 'Phi Vertical Line',
    description: 'Vertical alignment line at golden ratio division',
    category: 'structural',
    cipherProperties: {
      semanticLevel: 'normal',
      waveFrequency: 0.382,
      colorPsychology: ['structure', 'alignment'],
      phiRelations: ['phi-ratio', 'phi-spiral'],
      azimuthAngles: []
    },
    visualProperties: {
      colors: ['primary', 'border-light'],
      spacing: [],
      typography: [],
      transforms: ['phi-line-width']
    },
    permutations: ['phi-line-left', 'phi-line-right', 'phi-line-center'],
    dependencies: [],
    usage: ['sections', 'containers']
  },
  {
    id: 'phi-lateral-horizontal',
    type: 'pattern',
    name: 'Phi Horizontal Lateral',
    description: 'Horizontal line at phi division',
    category: 'structural',
    cipherProperties: {
      semanticLevel: 'normal',
      waveFrequency: 0.382,
      colorPsychology: ['division', 'rhythm'],
      phiRelations: ['phi-ratio-inv', 'phi-lateral-position-h'],
      azimuthAngles: []
    },
    visualProperties: {
      colors: ['primary', 'border-light'],
      spacing: [],
      typography: [],
      transforms: ['phi-line-width']
    },
    permutations: ['lateral-top', 'lateral-middle', 'lateral-bottom'],
    dependencies: [],
    usage: ['sections']
  },
  {
    id: 'phi-tangent',
    type: 'pattern',
    name: 'Phi Tangent',
    description: 'Curved line following golden ratio spiral',
    category: 'structural',
    cipherProperties: {
      semanticLevel: 'medium',
      waveFrequency: 0.618,
      colorPsychology: ['flow', 'harmony'],
      phiRelations: ['phi-spiral', 'phi-tangent-radius'],
      azimuthAngles: []
    },
    visualProperties: {
      colors: ['primary'],
      spacing: [],
      typography: [],
      transforms: ['radial-gradient']
    },
    permutations: ['tangent-top', 'tangent-center', 'tangent-bottom'],
    dependencies: [],
    usage: ['sections', 'hero', 'cards']
  },
  {
    id: 'phi-lateral-angular-1',
    type: 'pattern',
    name: 'Angular Lateral 38.2°',
    description: 'Diagonal line at 38.2° (phi-based angle)',
    category: 'structural',
    cipherProperties: {
      semanticLevel: 'medium',
      waveFrequency: 0.618,
      colorPsychology: ['direction', 'energy'],
      phiRelations: ['phi-azimuth-1'],
      azimuthAngles: [38.2]
    },
    visualProperties: {
      colors: ['primary'],
      spacing: [],
      typography: [],
      transforms: ['linear-gradient-angular']
    },
    symmetryHarmony: {
      symmetryMode: 'asymmetric',
      harmonyLevel: 'medium',
      sqrt2Relations: ['diag-angle-1'],
      diagonalAngles: [83.2]
    },
    permutations: ['angular-1-top', 'angular-1-bottom', 'angular-1-overlay'],
    dependencies: [],
    usage: ['sections', 'header', 'hero']
  },
  {
    id: 'phi-lateral-angular-2',
    type: 'pattern',
    name: 'Angular Lateral 61.8°',
    description: 'Diagonal line at 61.8° (phi angle)',
    category: 'structural',
    cipherProperties: {
      semanticLevel: 'medium',
      waveFrequency: 0.618,
      colorPsychology: ['balance', 'harmony'],
      phiRelations: ['phi-azimuth-2'],
      azimuthAngles: [61.8]
    },
    visualProperties: {
      colors: ['primary-dark'],
      spacing: [],
      typography: [],
      transforms: ['linear-gradient-angular']
    },
    permutations: ['angular-2-top', 'angular-2-bottom', 'angular-2-overlay'],
    dependencies: [],
    usage: ['sections', 'footer']
  },
  {
    id: 'phi-lateral-angular-3',
    type: 'pattern',
    name: 'Angular Lateral 23.6°',
    description: 'Diagonal line at 23.6° (phi² angle)',
    category: 'structural',
    cipherProperties: {
      semanticLevel: 'normal',
      waveFrequency: 0.382,
      colorPsychology: ['calm', 'subtlety'],
      phiRelations: ['phi-azimuth-3'],
      azimuthAngles: [23.6]
    },
    visualProperties: {
      colors: ['calm'],
      spacing: [],
      typography: [],
      transforms: ['linear-gradient-angular']
    },
    permutations: ['angular-3-overlay'],
    dependencies: [],
    usage: ['forms', 'contact-sections']
  },
  {
    id: 'phi-lateral-angular-4',
    type: 'pattern',
    name: 'Angular Lateral 76.4°',
    description: 'Diagonal line at 76.4° (phi + inverse phi)',
    category: 'structural',
    cipherProperties: {
      semanticLevel: 'medium',
      waveFrequency: 0.618,
      colorPsychology: ['completion', 'wholeness'],
      phiRelations: ['phi-azimuth-4'],
      azimuthAngles: [76.4]
    },
    visualProperties: {
      colors: ['success'],
      spacing: [],
      typography: [],
      transforms: ['linear-gradient-angular']
    },
    permutations: ['angular-4-overlay'],
    dependencies: [],
    usage: ['sections', 'projects']
  },
  {
    id: 'bg-pattern-phi-grid',
    type: 'pattern',
    name: 'Phi Grid Pattern',
    description: 'Background grid pattern using phi-based angles',
    category: 'background',
    cipherProperties: {
      semanticLevel: 'normal',
      waveFrequency: 0.382,
      colorPsychology: ['structure', 'foundation'],
      phiRelations: ['phi-grid-cell', 'phi-azimuth'],
      azimuthAngles: [38.2, 61.8]
    },
    visualProperties: {
      colors: ['primary'],
      spacing: [],
      typography: [],
      transforms: ['linear-gradient-angular']
    },
    permutations: ['grid-subtle', 'grid-light', 'grid-soft'],
    dependencies: [],
    usage: ['backgrounds', 'footer']
  },
  {
    id: 'bg-pattern-phi-radial',
    type: 'pattern',
    name: 'Phi Radial Pattern',
    description: 'Radial gradients at phi spiral points',
    category: 'background',
    cipherProperties: {
      semanticLevel: 'normal',
      waveFrequency: 0.382,
      colorPsychology: ['focus', 'emphasis'],
      phiRelations: ['phi-spiral'],
      azimuthAngles: []
    },
    visualProperties: {
      colors: ['primary'],
      spacing: [],
      typography: [],
      transforms: ['radial-gradient']
    },
    permutations: ['radial-subtle', 'radial-light'],
    dependencies: [],
    usage: ['backgrounds', 'sections']
  },
  {
    id: 'bg-pattern-angular',
    type: 'pattern',
    name: 'Angular Pattern',
    description: 'Angular gradient overlays at phi-based angles',
    category: 'background',
    cipherProperties: {
      semanticLevel: 'medium',
      waveFrequency: 0.618,
      colorPsychology: ['direction', 'flow'],
      phiRelations: ['phi-azimuth'],
      azimuthAngles: [38.2, 61.8]
    },
    visualProperties: {
      colors: ['primary'],
      spacing: [],
      typography: [],
      transforms: ['linear-gradient-angular', 'background-blend-mode']
    },
    permutations: ['angular-overlay', 'angular-blend'],
    dependencies: [],
    usage: ['sections']
  }
];

// === LAYOUT BLOCKS ===
export const layoutBlocks: DesignBlock[] = [
  {
    id: 'layout-asymmetric-grid',
    type: 'layout',
    name: 'Asymmetric Grid',
    description: 'Grid with phi-based column ratios',
    category: 'layout',
    cipherProperties: {
      semanticLevel: 'medium',
      waveFrequency: 1.0,
      colorPsychology: ['balance', 'interest'],
      phiRelations: ['phi-ratio', 'phi-ratio-inv'],
      azimuthAngles: [38.2, 61.8]
    },
    visualProperties: {
      colors: [],
      spacing: ['space-xl', 'space-2xl'],
      typography: [],
      transforms: ['phi-line-vertical', 'phi-lateral-angular-1']
    },
    permutations: ['grid-2-1', 'grid-3-2', 'grid-phi-split'],
    dependencies: ['card-grid'],
    usage: ['index', 'about']
  },
  {
    id: 'layout-centered-lateral',
    type: 'layout',
    name: 'Centered with Lateral Lines',
    description: 'Centered content with phi lateral lines',
    category: 'layout',
    cipherProperties: {
      semanticLevel: 'medium',
      waveFrequency: 0.618,
      colorPsychology: ['focus', 'clarity'],
      phiRelations: ['phi-lateral-horizontal', 'phi-tangent'],
      azimuthAngles: []
    },
    visualProperties: {
      colors: [],
      spacing: ['space-2xl', 'space-3xl'],
      typography: [],
      transforms: ['phi-lateral-horizontal', 'phi-tangent']
    },
    permutations: ['centered-standard', 'centered-wide'],
    dependencies: [],
    usage: ['index', 'services']
  },
  {
    id: 'layout-diagonal-flow',
    type: 'layout',
    name: 'Diagonal Flow',
    description: 'Diagonal arrangement with angular elements',
    category: 'layout',
    cipherProperties: {
      semanticLevel: 'high',
      waveFrequency: 1.618,
      colorPsychology: ['energy', 'movement'],
      phiRelations: ['phi-azimuth'],
      azimuthAngles: [38.2, 61.8, 23.6]
    },
    visualProperties: {
      colors: [],
      spacing: ['space-xl', 'space-2xl'],
      typography: [],
      transforms: ['phi-lateral-angular-2', 'phi-lateral-angular-3']
    },
    permutations: ['diagonal-left', 'diagonal-right', 'diagonal-zigzag'],
    dependencies: [],
    usage: ['index', 'projects']
  },
  {
    id: 'layout-timeline',
    type: 'layout',
    name: 'Timeline Layout',
    description: 'Vertical timeline with phi spiral positioning',
    category: 'layout',
    cipherProperties: {
      semanticLevel: 'medium',
      waveFrequency: 0.618,
      colorPsychology: ['progression', 'history'],
      phiRelations: ['phi-spiral', 'phi-line-vertical'],
      azimuthAngles: []
    },
    visualProperties: {
      colors: [],
      spacing: ['space-2xl', 'space-3xl'],
      typography: [],
      transforms: ['timeline-line']
    },
    permutations: ['timeline-left', 'timeline-center', 'timeline-right'],
    dependencies: [],
    usage: ['about']
  },
  {
    id: 'layout-masonry',
    type: 'layout',
    name: 'Masonry Grid',
    description: 'Masonry-style grid with phi proportions',
    category: 'layout',
    cipherProperties: {
      semanticLevel: 'medium',
      waveFrequency: 1.0,
      colorPsychology: ['organization', 'variety'],
      phiRelations: ['phi-ratio', 'phi-ratio-inv'],
      azimuthAngles: [61.8]
    },
    visualProperties: {
      colors: [],
      spacing: ['space-lg', 'space-xl'],
      typography: [],
      transforms: ['phi-line-vertical', 'phi-line-vertical-inv', 'phi-lateral-angular-2']
    },
    permutations: ['masonry-2col', 'masonry-3col', 'masonry-4col'],
    dependencies: ['card-grid'],
    usage: ['resources']
  },
  {
    id: 'layout-showcase',
    type: 'layout',
    name: 'Showcase Grid',
    description: 'Showcase grid with varied card sizes',
    category: 'layout',
    cipherProperties: {
      semanticLevel: 'high',
      waveFrequency: 1.618,
      colorPsychology: ['emphasis', 'importance'],
      phiRelations: ['phi-tangent', 'phi-azimuth-4'],
      azimuthAngles: [76.4]
    },
    visualProperties: {
      colors: [],
      spacing: ['space-xl', 'space-2xl'],
      typography: [],
      transforms: ['phi-tangent', 'phi-lateral-angular-4']
    },
    permutations: ['showcase-featured', 'showcase-uniform', 'showcase-varied'],
    dependencies: ['card-grid'],
    usage: ['projects']
  }
];

// === ELEMENT BLOCKS ===
export const elementBlocks: DesignBlock[] = [
  {
    id: 'section-title',
    type: 'element',
    name: 'Section Title',
    description: 'Section heading with semantic text and phi-based styling',
    category: 'typography',
    cipherProperties: {
      semanticLevel: 'high',
      waveFrequency: 1.618,
      colorPsychology: ['authority', 'importance'],
      phiRelations: ['phi-ratio', 'phi-spiral'],
      azimuthAngles: []
    },
    visualProperties: {
      colors: ['primary-dark'],
      spacing: ['space-lg'],
      typography: ['font-h2', 'text-4xl-practical'],
      transforms: []
    },
    permutations: ['title-left', 'title-center', 'title-right'],
    dependencies: ['semantic-text'],
    usage: ['all-sections']
  },
  {
    id: 'section-description',
    type: 'element',
    name: 'Section Description',
    description: 'Section description text with semantic encoding',
    category: 'typography',
    cipherProperties: {
      semanticLevel: 'normal',
      waveFrequency: 0.618,
      colorPsychology: ['clarity', 'information'],
      phiRelations: ['phi-ratio'],
      azimuthAngles: []
    },
    visualProperties: {
      colors: ['text-secondary'],
      spacing: ['space-2xl'],
      typography: ['text-base', 'text-lg-practical'],
      transforms: []
    },
    permutations: ['description-standard'],
    dependencies: ['semantic-text'],
    usage: ['all-sections']
  },
  {
    id: 'evidence-section',
    type: 'element',
    name: 'Evidence Section',
    description: 'Highlighted section for evidence/citations with primary-dark color',
    category: 'content',
    cipherProperties: {
      semanticLevel: 'high',
      waveFrequency: 1.618,
      colorPsychology: ['authority', 'truth', 'evidence'],
      phiRelations: ['phi-enhanced', 'phi-spiral'],
      azimuthAngles: [38.2, 61.8]
    },
    visualProperties: {
      colors: ['primary-dark', 'primary-ultra-light', 'surface-elevated'],
      spacing: ['space-3xl'],
      typography: ['text-lg-practical'],
      transforms: ['phi-enhanced', 'wisdom-section']
    },
    permutations: ['evidence-standard', 'evidence-wisdom', 'evidence-enhanced'],
    dependencies: ['semantic-text'],
    usage: ['about', 'index']
  },
  {
    id: 'philosophy-section',
    type: 'element',
    name: 'Philosophy Section',
    description: 'Section with primary-dark color for authority',
    category: 'content',
    cipherProperties: {
      semanticLevel: 'high',
      waveFrequency: 1.618,
      colorPsychology: ['authority', 'trust', 'expertise'],
      phiRelations: ['phi-line-vertical', 'phi-tangent'],
      azimuthAngles: [38.2, 61.8]
    },
    visualProperties: {
      colors: ['primary-dark', 'primary-light', 'primary-ultra-light'],
      spacing: ['space-3xl', 'space-4xl'],
      typography: ['font-h2'],
      transforms: ['phi-line-vertical', 'phi-tangent']
    },
    permutations: ['philosophy-standard', 'philosophy-enhanced'],
    dependencies: ['semantic-text'],
    usage: ['about']
  }
];

// === SYSTEM BLOCKS ===
export const systemBlocks: DesignBlock[] = [
  {
    id: 'wave-function-cipher',
    type: 'system',
    name: 'Wave Function Cipher',
    description: 'Fourier transform-based cipher system for per-letter encoding',
    category: 'system',
    cipherProperties: {
      semanticLevel: 'high',
      waveFrequency: 1.618,
      colorPsychology: ['all-colors'],
      phiRelations: ['all-phi'],
      azimuthAngles: [38.2, 61.8, 23.6, 76.4]
    },
    visualProperties: {
      colors: ['all-colors'],
      spacing: ['wave-spacing'],
      typography: ['all-scales'],
      transforms: ['wave-opacity', 'wave-position', 'wave-semantic']
    },
    permutations: ['cipher-high', 'cipher-medium', 'cipher-normal'],
    dependencies: [],
    usage: ['all-elements']
  },
  {
    id: 'color-psychology-system',
    type: 'system',
    name: 'Color Psychology System',
    description: 'Additive color semantics with psychology mapping',
    category: 'system',
    cipherProperties: {
      semanticLevel: 'high',
      waveFrequency: 1.0,
      colorPsychology: ['authority', 'trust', 'expertise'],
      phiRelations: ['phi-ratio'],
      azimuthAngles: []
    },
    visualProperties: {
      colors: ['primary', 'primary-dark', 'primary-light'],
      spacing: [],
      typography: [],
      transforms: []
    },
    permutations: ['color-primary', 'color-primary-dark', 'color-primary-light'],
    dependencies: [],
    usage: ['all-elements']
  },
  {
    id: 'phi-spacing-system',
    type: 'system',
    name: 'Phi Spacing System',
    description: 'Golden ratio-based spacing scale',
    category: 'system',
    cipherProperties: {
      semanticLevel: 'normal',
      waveFrequency: 0.618,
      colorPsychology: [],
      phiRelations: ['all-phi-spacing'],
      azimuthAngles: []
    },
    visualProperties: {
      colors: [],
      spacing: ['space-xs', 'space-sm', 'space-md', 'space-lg', 'space-xl', 'space-2xl', 'space-3xl', 'space-4xl', 'space-5xl', 'space-6xl'],
      typography: [],
      transforms: []
    },
    permutations: [],
    dependencies: [],
    usage: ['all-elements']
  },
  {
    id: 'phi-typography-system',
    type: 'system',
    name: 'Phi Typography System',
    description: 'Golden ratio-based typography scale',
    category: 'system',
    cipherProperties: {
      semanticLevel: 'normal',
      waveFrequency: 0.618,
      colorPsychology: [],
      phiRelations: ['phi', 'phi-sqrt'],
      azimuthAngles: []
    },
    visualProperties: {
      colors: [],
      spacing: [],
      typography: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'font-h1', 'font-h2', 'font-h3'],
      transforms: []
    },
    permutations: [],
    dependencies: [],
    usage: ['all-text']
  }
];

// === ALL BLOCKS COMBINED ===
export const allBlocks: DesignBlock[] = [
  ...componentBlocks,
  ...patternBlocks,
  ...layoutBlocks,
  ...elementBlocks,
  ...systemBlocks
];

// === BLOCK PERMUTATIONS ===
export const blockPermutations: BlockPermutation[] = [
  // Home page permutations
  {
    id: 'home-layout-a',
    blockIds: ['hero', 'layout-asymmetric-grid', 'phi-line-vertical', 'phi-lateral-angular-1', 'card-grid', 'card', 'semantic-text'],
    layout: 'asymmetric',
    azimuth: 38.2,
    phiRatio: 0.618,
    cipherIntensity: 0.8
  },
  {
    id: 'home-layout-b',
    blockIds: ['hero', 'layout-centered-lateral', 'phi-lateral-horizontal', 'phi-tangent', 'card-grid', 'card', 'semantic-text'],
    layout: 'stack',
    azimuth: 0,
    phiRatio: 0.618,
    cipherIntensity: 0.7
  },
  {
    id: 'home-layout-c',
    blockIds: ['hero', 'layout-diagonal-flow', 'phi-lateral-angular-2', 'phi-lateral-angular-3', 'card-grid', 'card', 'semantic-text'],
    layout: 'diagonal',
    azimuth: 61.8,
    phiRatio: 0.618,
    cipherIntensity: 0.9
  },
  // About page permutations
  {
    id: 'about-layout-a',
    blockIds: ['hero', 'layout-timeline', 'timeline-line', 'philosophy-section', 'evidence-section', 'card-grid', 'semantic-text'],
    layout: 'stack',
    azimuth: 0,
    phiRatio: 0.618,
    cipherIntensity: 0.85
  },
  // Services page permutations
  {
    id: 'services-layout-a',
    blockIds: ['hero', 'layout-centered-lateral', 'phi-lateral-horizontal', 'phi-tangent', 'card-grid', 'inquiry-form', 'semantic-text'],
    layout: 'flow',
    azimuth: 0,
    phiRatio: 0.618,
    cipherIntensity: 0.75
  },
  {
    id: 'services-layout-b',
    blockIds: ['hero', 'layout-asymmetric-grid', 'phi-line-vertical', 'phi-lateral-angular-1', 'card-grid', 'inquiry-form', 'semantic-text'],
    layout: 'asymmetric',
    azimuth: 38.2,
    phiRatio: 0.618,
    cipherIntensity: 0.8
  },
  // Resources page permutations
  {
    id: 'resources-layout-a',
    blockIds: ['hero', 'layout-masonry', 'phi-line-vertical', 'phi-line-vertical-inv', 'phi-lateral-angular-2', 'card-grid', 'search-bar', 'industry-filters', 'semantic-text'],
    layout: 'masonry',
    azimuth: 61.8,
    phiRatio: 0.618,
    cipherIntensity: 0.8
  },
  // Projects page permutations
  {
    id: 'projects-layout-a',
    blockIds: ['hero', 'layout-showcase', 'phi-tangent', 'phi-lateral-angular-4', 'card-grid', 'semantic-text'],
    layout: 'asymmetric',
    azimuth: 76.4,
    phiRatio: 0.618,
    cipherIntensity: 0.9
  }
];

// === UTILITY FUNCTIONS ===
export function getBlockById(id: string): DesignBlock | undefined {
  return allBlocks.find(block => block.id === id);
}

export function getBlocksByCategory(category: string): DesignBlock[] {
  return allBlocks.filter(block => block.category === category);
}

export function getBlocksByType(type: DesignBlock['type']): DesignBlock[] {
  return allBlocks.filter(block => block.type === type);
}

export function getPermutationById(id: string): BlockPermutation | undefined {
  return blockPermutations.find(perm => perm.id === id);
}

export function getAllPermutationsForPage(page: string): BlockPermutation[] {
  return blockPermutations.filter(perm => perm.id.startsWith(page));
}

// === VECTOR REPRESENTATION ===
export interface BlockVector {
  blockId: string;
  vector: number[];
  metadata: {
    type: string;
    category: string;
    semanticLevel: number;
    waveFrequency: number;
    colorCount: number;
    transformCount: number;
  };
}

export function vectorizeBlock(block: DesignBlock): BlockVector {
  // Create vector representation for data extraction
  const semanticLevelValue = block.cipherProperties.semanticLevel === 'high' ? 1.618 : 
                            block.cipherProperties.semanticLevel === 'medium' ? 1.0 : 0.618;
  
  return {
    blockId: block.id,
    vector: [
      semanticLevelValue,
      block.cipherProperties.waveFrequency,
      block.cipherProperties.phiRelations.length,
      block.cipherProperties.azimuthAngles.length,
      block.visualProperties.colors.length,
      block.visualProperties.spacing.length,
      block.visualProperties.typography.length,
      block.visualProperties.transforms.length,
      block.permutations.length,
      block.dependencies.length,
      block.usage.length
    ],
    metadata: {
      type: block.type,
      category: block.category,
      semanticLevel: semanticLevelValue,
      waveFrequency: block.cipherProperties.waveFrequency,
      colorCount: block.visualProperties.colors.length,
      transformCount: block.visualProperties.transforms.length
    }
  };
}

export function vectorizeAllBlocks(): BlockVector[] {
  return allBlocks.map(block => vectorizeBlock(block));
}

// === PERMUTATION GENERATOR ===
export function generateAllPermutations(blocks: DesignBlock[]): BlockPermutation[] {
  const permutations: BlockPermutation[] = [];
  const layouts: BlockPermutation['layout'][] = ['grid', 'stack', 'flow', 'radial', 'asymmetric', 'diagonal', 'masonry'];
  const azimuths = [0, 23.6, 38.2, 61.8, 76.4];
  
  // Generate permutations for different combinations
  blocks.forEach((block, index) => {
    layouts.forEach((layout, layoutIndex) => {
      azimuths.forEach((azimuth, azimuthIndex) => {
        permutations.push({
          id: `perm-${block.id}-${layout}-${azimuth}`,
          blockIds: [block.id],
          layout,
          azimuth,
          phiRatio: 0.618,
          cipherIntensity: (index + layoutIndex + azimuthIndex) % 10 / 10
        });
      });
    });
  });
  
  return permutations;
}

// === TOKEN MAPPING FUNCTIONS ===
/**
 * Map design block visual properties to actual CSS tokens
 * Implements Sierpinski pattern: tokens reference tokens
 */
export function mapVisualPropertyToToken(property: string, category: 'colors' | 'spacing' | 'typography' | 'transforms'): string {
  // Color mappings
  if (category === 'colors') {
    const colorMap: Record<string, string> = {
      'primary': '--primary-color',
      'primary-dark': '--primary-dark',
      'primary-light': '--primary-light',
      'primary-ultra-light': '--primary-ultra-light',
      'surface-elevated': '--surface-elevated',
      'bg-accent': '--bg-accent',
      'surface': '--surface',
      'calm': '--color-calm',
      'calm-light': '--color-calm-light',
      'dark-surface': '--dark-surface',
      'success': '--color-success',
      'border-light': '--border-light',
    };
    return colorMap[property] || `--${property}`;
  }
  
  // Spacing mappings
  if (category === 'spacing') {
    if (property.startsWith('space-')) {
      return `--${property}`;
    }
    return `--space-${property}`;
  }
  
  // Typography mappings
  if (category === 'typography') {
    if (property.startsWith('font-') || property.startsWith('text-')) {
      return `--${property}`;
    }
    return `--text-${property}`;
  }
  
  // Transform mappings
  if (category === 'transforms') {
    const transformMap: Record<string, string> = {
      'phi-tangent': '--phi-tangent-radius',
      'phi-lateral-angular-1': '--phi-azimuth-1',
      'phi-lateral-angular-2': '--phi-azimuth-2',
      'phi-lateral-angular-3': '--phi-azimuth-3',
      'phi-lateral-angular-4': '--phi-azimuth-4',
      'phi-line-width': '--phi-line-width',
      'phi-line-vertical': '--phi-ratio',
      'phi-lateral-horizontal': '--phi-lateral-position-h',
      'bg-pattern-phi-grid': '--phi-grid-cell-h',
      'bg-pattern-phi-radial': '--phi-spiral-2',
      'bg-pattern-angular': '--phi-azimuth-1',
    };
    return transformMap[property] || `--${property}`;
  }
  
  return `--${property}`;
}

/**
 * Get all CSS tokens for a design block
 */
export function getTokensForDesignBlock(block: DesignBlock): string[] {
  const tokens: string[] = [];
  
  // Map colors
  block.visualProperties.colors.forEach(color => {
    tokens.push(mapVisualPropertyToToken(color, 'colors'));
  });
  
  // Map spacing
  block.visualProperties.spacing.forEach(spacing => {
    tokens.push(mapVisualPropertyToToken(spacing, 'spacing'));
  });
  
  // Map typography
  block.visualProperties.typography.forEach(typography => {
    tokens.push(mapVisualPropertyToToken(typography, 'typography'));
  });
  
  // Map transforms
  block.visualProperties.transforms.forEach(transform => {
    tokens.push(mapVisualPropertyToToken(transform, 'transforms'));
  });
  
  // Map azimuth angles
  block.cipherProperties.azimuthAngles.forEach(angle => {
    if (angle === 38.2) tokens.push('--phi-azimuth-1');
    if (angle === 61.8) tokens.push('--phi-azimuth-2');
    if (angle === 23.6) tokens.push('--phi-azimuth-3');
    if (angle === 76.4) tokens.push('--phi-azimuth-4');
  });
  
  return [...new Set(tokens)]; // Remove duplicates
}

