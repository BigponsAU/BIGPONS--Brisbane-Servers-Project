/**
 * Voice Profile Model
 * Defines the structure for voice characteristics and tone analysis
 */

export interface VoiceProfile {
  voiceName: string;
  version: string;
  sourceDocument: string;
  characteristics: VoiceCharacteristics;
  extrapolationGuidelines: ExtrapolationGuidelines;
}

export interface VoiceCharacteristics {
  tone: ToneProfile;
  linguisticPatterns: LinguisticPatterns;
  structuralPatterns: StructuralPatterns;
  domainKnowledge: DomainKnowledge;
  voiceMarkers: VoiceMarkers;
  semanticDensity: SemanticDensity;
}

export interface ToneProfile {
  formality: 'casual' | 'professional' | 'formal';
  technicality: 'low' | 'moderate' | 'high' | 'very_high';
  accessibility: 'low' | 'moderate' | 'high';
  precision: 'low' | 'moderate' | 'high' | 'very_high';
  comprehensiveness: 'low' | 'moderate' | 'high' | 'very_high';
}

export interface LinguisticPatterns {
  sentenceStructure: SentenceStructure;
  vocabulary: Vocabulary;
  numericalPrecision: NumericalPrecision;
}

export interface SentenceStructure {
  averageLength: 'short' | 'medium' | 'medium_to_long' | 'long';
  complexity: 'low' | 'moderate' | 'moderate_to_high' | 'high';
  preference: 'declarative_statements' | 'questions' | 'imperatives' | 'mixed';
  coordination: string;
}

export interface Vocabulary {
  technicalTerms: string[];
  descriptiveTerms: string[];
  relationshipTerms: string[];
}

export interface NumericalPrecision {
  specificValues: boolean;
  commonValues: number[];
  formatting: string;
  units: string[];
}

export interface StructuralPatterns {
  organization: Organization;
  contentFlow: ContentFlow;
}

export interface Organization {
  hierarchical: boolean;
  sections: boolean;
  subsections: boolean;
  lists: 'rare' | 'occasional' | 'frequent' | 'very_frequent';
  bulletPoints: 'rare' | 'occasional' | 'frequent' | 'very_frequent';
}

export interface ContentFlow {
  overviewFirst: boolean;
  detailsAfter: boolean;
  examplesProvided: boolean;
  conclusions: boolean;
}

export interface DomainKnowledge {
  mathematicalConcepts: string[];
  designConcepts: string[];
  technicalConcepts: string[];
}

export interface VoiceMarkers {
  openingPhrases: string[];
  connectingPhrases: string[];
  emphasisPhrases: string[];
  closingPhrases: string[];
}

export interface SemanticDensity {
  informationPerSentence: 'low' | 'moderate' | 'high' | 'very_high';
  technicalTermsPerParagraph: 'low' | 'moderate' | 'high' | 'very_high';
  specificity: 'low' | 'moderate' | 'high' | 'very_high';
  abstraction: 'low' | 'moderate' | 'high';
}

export interface ExtrapolationGuidelines {
  maintainPrecision: boolean;
  useDomainTerms: boolean;
  preserveStructure: boolean;
  extendConcepts: boolean;
  maintainRelationships: boolean;
  addSpecificValues: boolean;
}

