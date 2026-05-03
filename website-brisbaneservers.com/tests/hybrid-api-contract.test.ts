import { describe, expect, it } from 'vitest';
import { standaloneApiRoutes } from '../standalone-api/route-manifest';
import { getInternalApiBaseUrl, resolvePublicApiUrl } from '../src/lib/api-config';

describe('Hybrid API contract coverage', () => {
  it('includes required portal and auth endpoints', () => {
    const routePaths = new Set(standaloneApiRoutes.map((route) => route.path));

    const required = [
      '/api/health',
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/me',
      '/api/resources',
      '/api/resources/public',
      '/api/resources/generate',
      '/api/resources/upload',
      '/api/resources/community-upload',
      '/api/resources/:id',
      '/api/profiles',
      '/api/profiles/:id',
      '/api/tokens/me',
      '/api/community/by-topic',
      '/api/community/contributions',
      '/api/community/my-contributions',
      '/api/community/approve',
      '/api/community/reject',
    ];

    for (const path of required) {
      expect(routePaths.has(path)).toBe(true);
    }
  });

  it('resolves API URLs using normalized base paths', () => {
    const originalPublic = process.env.PUBLIC_API_BASE_URL;
    const originalInternal = process.env.INTERNAL_API_BASE_URL;

    process.env.PUBLIC_API_BASE_URL = 'https://api.example.com/api/';
    process.env.INTERNAL_API_BASE_URL = 'https://internal.example.com/api/';

    expect(resolvePublicApiUrl('resources/public')).toBe('https://api.example.com/api/resources/public');
    expect(getInternalApiBaseUrl()).toBe('https://internal.example.com/api');

    if (originalPublic === undefined) {
      delete process.env.PUBLIC_API_BASE_URL;
    } else {
      process.env.PUBLIC_API_BASE_URL = originalPublic;
    }

    if (originalInternal === undefined) {
      delete process.env.INTERNAL_API_BASE_URL;
    } else {
      process.env.INTERNAL_API_BASE_URL = originalInternal;
    }
  });
});
