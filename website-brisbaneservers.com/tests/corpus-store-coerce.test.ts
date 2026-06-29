import { describe, expect, it } from 'vitest';
import {
  asCorpusArray,
  asCorpusObject,
  coerceCorpusPayload,
  isStringEncodedCorpusPayload,
  normalizeForJsonbStorage,
  unwrapCorpusJsonPayload,
} from '../src/lib/corpus-payload-coerce';

describe('corpus jsonb coercion', () => {
  it('unwraps string-encoded array payloads', () => {
    const raw = JSON.stringify([{ id: 'a' }]);
    expect(unwrapCorpusJsonPayload(raw)).toEqual([{ id: 'a' }]);
    expect(coerceCorpusPayload(raw)).toEqual([{ id: 'a' }]);
    expect(isStringEncodedCorpusPayload(raw)).toBe(true);
  });

  it('unwraps string-encoded object payloads', () => {
    const raw = JSON.stringify({ profiles: [], version: '1' });
    expect(unwrapCorpusJsonPayload(raw)).toEqual({ profiles: [], version: '1' });
  });

  it('passes through proper arrays and objects', () => {
    const arr = [{ id: 1 }];
    const obj = { chunks: [] };
    expect(unwrapCorpusJsonPayload(arr)).toBe(arr);
    expect(unwrapCorpusJsonPayload(obj)).toBe(obj);
    expect(isStringEncodedCorpusPayload(arr)).toBe(false);
  });

  it('normalizeForJsonbStorage unwraps before save', () => {
    const wrapped = JSON.stringify([{ id: 'x' }]);
    expect(normalizeForJsonbStorage(wrapped)).toEqual([{ id: 'x' }]);
  });

  it('asCorpusArray returns fallback on wrong shape', () => {
    expect(asCorpusArray({ bad: true }, [])).toEqual([]);
    expect(asCorpusArray(JSON.stringify([1]), [])).toEqual([1]);
  });

  it('asCorpusObject returns fallback on wrong shape', () => {
    const fallback = { profiles: [], version: '1.0.0', lastUpdated: '' };
    expect(asCorpusObject([], fallback)).toBe(fallback);
    expect(asCorpusObject({ profiles: [] }, fallback).profiles).toEqual([]);
  });
});
