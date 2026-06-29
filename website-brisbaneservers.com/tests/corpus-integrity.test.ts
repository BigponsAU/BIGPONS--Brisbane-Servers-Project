import { describe, expect, it } from 'vitest';
import {
  corpusPayloadKind,
  isStringEncodedCorpusPayload,
} from '../src/lib/corpus-payload-coerce';

describe('corpus payload detection', () => {
  it('detects string-encoded payloads', () => {
    expect(isStringEncodedCorpusPayload(JSON.stringify([]))).toBe(true);
    expect(isStringEncodedCorpusPayload([])).toBe(false);
    expect(corpusPayloadKind([])).toBe('array');
    expect(corpusPayloadKind({})).toBe('object');
    expect(corpusPayloadKind(null)).toBe('null');
  });
});
