/**
 * Resolve generate length options into a word target and inference maxTokens.
 * Legacy short/medium/long map to word bands; numeric values pass through.
 */

export type LengthPreset = 'short' | 'medium' | 'long' | 'full';

export interface ResolvedGenerateLength {
  /** Target body length for the model (approximate). */
  targetWords: number;
  /** Inclusive lower bound used in the prompt. */
  minWords: number;
  /** Inclusive upper bound used in the prompt. */
  maxWords: number;
  /** Completion budget (~1.4 tokens/word + headroom). */
  maxTokens: number;
  /** Template generator length hint. */
  templateLength: 'short' | 'medium' | 'long';
  label: string;
}

const PRESET_WORDS: Record<LengthPreset, number> = {
  short: 600,
  medium: 1100,
  long: 1600,
  full: 2200,
};

/** Allowed UI/API word targets (and aliases). */
export const GENERATE_WORD_OPTIONS = [600, 1100, 1600, 2200] as const;

export function resolveGenerateLength(
  length?: string | number | null,
  wordCount?: string | number | null
): ResolvedGenerateLength {
  const fromWords = coercePositiveInt(wordCount);
  const fromLength = coercePositiveInt(length);
  const preset =
    typeof length === 'string' && length in PRESET_WORDS
      ? (length as LengthPreset)
      : undefined;

  let targetWords =
    fromWords ??
    fromLength ??
    (preset ? PRESET_WORDS[preset] : undefined) ??
    PRESET_WORDS.medium;

  // Clamp so we never request tiny stubs or runaway completions.
  targetWords = Math.min(2800, Math.max(400, targetWords));

  const minWords = Math.max(350, Math.round(targetWords * 0.85));
  const maxWords = Math.round(targetWords * 1.15);
  const maxTokens = Math.min(8192, Math.max(1200, Math.ceil(targetWords * 1.55) + 400));

  let templateLength: ResolvedGenerateLength['templateLength'] = 'medium';
  if (targetWords <= 750) templateLength = 'short';
  else if (targetWords >= 1400) templateLength = 'long';

  return {
    targetWords,
    minWords,
    maxWords,
    maxTokens,
    templateLength,
    label: `~${targetWords} words`,
  };
}

function coercePositiveInt(value: string | number | null | undefined): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n);
}
