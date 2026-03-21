/**
 * Text Patterns Model
 * Defines patterns extracted from source text for generation
 */

export interface TextPattern {
  type: 'sentence' | 'phrase' | 'structure' | 'terminology';
  pattern: string;
  context: string[];
  frequency: number;
  examples: string[];
}

export interface SentencePattern {
  structure: string;
  components: {
    subject: string[];
    verb: string[];
    object: string[];
    modifiers: string[];
  };
  examples: string[];
}

export interface PhrasePattern {
  category: 'opening' | 'connecting' | 'emphasis' | 'closing' | 'technical';
  phrases: string[];
  contexts: string[];
}

export interface TerminologyPattern {
  term: string;
  definitions: string[];
  usageContexts: string[];
  relatedTerms: string[];
  frequency: number;
}

export interface NumericalPattern {
  value: number;
  unit?: string;
  context: string[];
  relationships: {
    relatedValues: number[];
    mathematicalRelation?: string;
  };
}

export const commonSentencePatterns: SentencePattern[] = [
  {
    structure: "[Subject] [verb] [object] with [technical detail]",
    components: {
      subject: ["Every element", "All blocks", "The system", "Each block"],
      verb: ["uses", "creates", "maintains", "provides"],
      object: ["wave function", "cipher system", "design blocks", "visual patterns"],
      modifiers: ["comprehensive", "all-encompassing", "mathematical precision"]
    },
    examples: [
      "Every element on the website uses the wave function cipher system as its baseline foundation.",
      "All blocks are vectorized and stored for data extraction."
    ]
  },
  {
    structure: "[Subject] [verb] [object] that [describes relationship]",
    components: {
      subject: ["This system", "The framework", "Each component"],
      verb: ["creates", "ensures", "allows for", "maintains"],
      object: ["visual harmony", "proportional relationships", "semantic meaning"],
      modifiers: ["through", "using", "via", "by means of"]
    },
    examples: [
      "This system creates a comprehensive, all-encompassing web presence where every element is ciphered.",
      "The framework ensures proportional harmony throughout the entire website."
    ]
  }
];

export const commonPhrasePatterns: PhrasePattern[] = [
  {
    category: "opening",
    phrases: [
      "This document describes",
      "Every element",
      "All blocks",
      "The system",
      "Each block"
    ],
    contexts: ["section introductions", "concept definitions"]
  },
  {
    category: "connecting",
    phrases: [
      "forms the foundation",
      "creates",
      "ensures",
      "allows for",
      "maintains",
      "preserves",
      "provides",
      "uses",
      "affects",
      "modulates"
    ],
    contexts: ["relationship descriptions", "system explanations"]
  },
  {
    category: "technical",
    phrases: [
      "wave function cipher",
      "Fourier transform-based",
      "phi-based",
      "azimuth-based",
      "semantic level",
      "vectorized",
      "golden ratio"
    ],
    contexts: ["technical descriptions", "system specifications"]
  },
  {
    category: "emphasis",
    phrases: [
      "comprehensive",
      "all-encompassing",
      "mathematical precision",
      "infinite expansion",
      "uniformity",
      "meaning preservation"
    ],
    contexts: ["key concepts", "important features"]
  }
];

export const commonNumericalPatterns: NumericalPattern[] = [
  {
    value: 1.618,
    context: ["phi ratio", "golden ratio", "high semantic level", "wave frequency"],
    relationships: {
      relatedValues: [0.618, 0.382],
      mathematicalRelation: "phi = 1.618, phi^-1 = 0.618, phi^-2 = 0.382"
    }
  },
  {
    value: 0.618,
    context: ["phi inverse", "normal semantic level", "wave frequency", "phi ratio"],
    relationships: {
      relatedValues: [1.618, 0.382],
      mathematicalRelation: "inverse of phi"
    }
  },
  {
    value: 38.2,
    unit: "degrees",
    context: ["azimuth angle", "phi inverse angle", "primary structural elements"],
    relationships: {
      relatedValues: [61.8, 23.6, 76.4],
      mathematicalRelation: "phi-based azimuth angles"
    }
  },
  {
    value: 61.8,
    unit: "degrees",
    context: ["azimuth angle", "phi angle", "balance and harmony"],
    relationships: {
      relatedValues: [38.2, 23.6, 76.4],
      mathematicalRelation: "phi-based azimuth angles"
    }
  }
];

