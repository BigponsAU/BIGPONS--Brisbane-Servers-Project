/**
 * Neutral consulting voice fallback — never the Design System / golden-ratio profile.
 * Used when no Brisbane/default profile is available in ProfileManager.
 */

import type { VoiceProfile } from '@voice-framework/models/voice-profile';

export const CONSULTING_FALLBACK_VOICE_PROFILE: VoiceProfile = {
  voiceName: 'Brisbane Consulting Voice',
  version: '1.0.0',
  sourceDocument: 'consulting-fallback',
  characteristics: {
    tone: {
      formality: 'professional',
      technicality: 'moderate',
      accessibility: 'high',
      precision: 'high',
      comprehensiveness: 'high',
    },
    linguisticPatterns: {
      vocabulary: {
        technicalTerms: [
          'operations',
          'workflow',
          'process',
          'implementation',
          'capability',
          'practice',
          'customer',
          'service',
        ],
        descriptiveTerms: ['clear', 'practical', 'actionable', 'reliable'],
        relationshipTerms: ['supports', 'improves', 'reduces', 'enables'],
      },
      numericalPrecision: {
        specificValues: false,
        commonValues: [],
        formatting: 'none',
        units: [],
      },
      sentenceStructure: {
        averageLength: 'medium',
        complexity: 'moderate',
        preference: 'declarative_statements',
        coordination: 'balanced',
      },
    },
    structuralPatterns: {
      organization: {
        hierarchical: true,
        sections: true,
        subsections: true,
        lists: 'frequent',
        bulletPoints: 'frequent',
      },
      contentFlow: {
        overviewFirst: true,
        detailsAfter: true,
        examplesProvided: true,
        conclusions: true,
      },
    },
    domainKnowledge: {
      mathematicalConcepts: [],
      designConcepts: [],
      technicalConcepts: [
        'Australian SMEs',
        'operational efficiency',
        'customer experience',
        'implementation planning',
      ],
    },
    voiceMarkers: {
      openingPhrases: ['In practice,', 'For most teams,', 'A practical starting point is'],
      connectingPhrases: ['This supports', 'That reduces', 'It enables'],
      emphasisPhrases: ['most important', 'highest leverage', 'clear ownership'],
      closingPhrases: ['Start small, measure, then scale.', 'Pilot before a full rollout.'],
    },
    semanticDensity: {
      informationPerSentence: 'high',
      technicalTermsPerParagraph: 'moderate',
      specificity: 'high',
      abstraction: 'moderate',
    },
  },
  extrapolationGuidelines: {
    maintainPrecision: true,
    useDomainTerms: true,
    preserveStructure: true,
    extendConcepts: true,
    maintainRelationships: true,
    addSpecificValues: false,
  },
};
