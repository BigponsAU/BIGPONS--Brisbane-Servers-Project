import { describe, expect, it } from 'vitest';
import {
    classifyQueryTokenMatch,
    fuzzyTokenMatch,
    levenshteinDistance,
    normalizeFuzzyToken,
    SEARCH_MIN_CHARS,
} from '../src/lib/search/fuzzy-text';

describe('fuzzy-text', () => {
    it('classifies prefix and typo matches for professional services queries', () => {
        expect(SEARCH_MIN_CHARS).toBe(3);
        expect(classifyQueryTokenMatch('proffesional', 'professional')).not.toBe('none');
        expect(classifyQueryTokenMatch('xyz', 'professional')).toBe('none');
    });

    it('collapses doubled letters for typo tolerance', () => {
        expect(normalizeFuzzyToken('proffesional')).toBe('profesional');
        expect(normalizeFuzzyToken('professional')).toBe('profesional');
    });

    it('matches intentional misspelling proffesional to professional', () => {
        expect(fuzzyTokenMatch('proffesional', 'professional')).toBe(true);
        expect(classifyQueryTokenMatch('proffesional', 'professional')).not.toBe('none');
    });

    it('computes levenshtein distance', () => {
        expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
        expect(levenshteinDistance('professional', 'profesional')).toBe(1);
    });
});
