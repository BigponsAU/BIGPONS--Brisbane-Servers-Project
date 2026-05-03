import { describe, expect, it } from 'vitest';
import { getRateLimiterForEndpoint, sanitizeInput, sanitizeObject } from '../dashboard/middleware/security';

describe('security middleware helpers', () => {
  it('sanitizes potentially unsafe string input', () => {
    const value = sanitizeInput('  <script>alert(1)</script>  ');
    expect(value).toBe('scriptalert(1)/script');
  });

  it('sanitizes nested object values recursively', () => {
    const payload = {
      title: '<b>Title</b>',
      nested: {
        body: '<img src=x onerror=1>',
      },
    };

    const sanitized = sanitizeObject(payload);
    expect(sanitized.title).toBe('bTitle/b');
    expect(sanitized.nested.body).toBe('img src=x onerror=1');
  });

  it('maps endpoints to the expected limiter buckets', () => {
    const heavy = getRateLimiterForEndpoint('/api/documents/upload');
    const generation = getRateLimiterForEndpoint('/api/resources/generate');
    const readOnly = getRateLimiterForEndpoint('/api/health');

    expect(heavy).toBeTypeOf('function');
    expect(generation).toBeTypeOf('function');
    expect(readOnly).toBeTypeOf('function');
    expect(heavy).not.toBe(readOnly);
  });
});
