import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearLegacyAuthTokenStorage,
  clearPersistedSession,
  isUsableAbsoluteApiBase,
  persistSessionToken,
  restorePersistedSessionToken,
  usesHttpOnlyCookieAuth,
  usesSessionStorageAuth,
} from '../src/lib/client-api';

function mockBrowserStorage(): void {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
  // @ts-expect-error test shim
  globalThis.sessionStorage = storage;
  // @ts-expect-error test shim
  globalThis.localStorage = storage;
}

describe('client-api auth security', () => {
  beforeEach(() => {
    mockBrowserStorage();
    clearPersistedSession();
    clearLegacyAuthTokenStorage();
    sessionStorage.clear();
  });

  it('rejects misconfigured api1 bases', () => {
    expect(isUsableAbsoluteApiBase('https://api1.brisbaneservers.com/api1')).toBe(false);
    expect(isUsableAbsoluteApiBase('https://brisbane-servers-api.onrender.com/api')).toBe(true);
  });

  it('uses HttpOnly cookie mode on brisbaneservers.com API hosts', () => {
    expect(usesHttpOnlyCookieAuth('https://api.brisbaneservers.com/api')).toBe(true);
    expect(usesSessionStorageAuth('https://api.brisbaneservers.com/api')).toBe(false);
  });

  it('uses sessionStorage fallback on cross-origin Render API', () => {
    expect(usesHttpOnlyCookieAuth('https://brisbane-servers-api.onrender.com/api')).toBe(false);
    expect(usesSessionStorageAuth('https://brisbane-servers-api.onrender.com/api')).toBe(true);
  });

  it('does not persist JWT to sessionStorage when API is on brisbaneservers.com', () => {
    persistSessionToken('test-jwt', 'https://api.brisbaneservers.com/api');
    expect(sessionStorage.getItem('bsAccountSession')).toBeNull();
  });

  it('persists JWT to sessionStorage only for cross-origin API', () => {
    persistSessionToken('test-jwt', 'https://brisbane-servers-api.onrender.com/api');
    expect(sessionStorage.getItem('bsAccountSession')).toBe('test-jwt');
    expect(restorePersistedSessionToken('https://brisbane-servers-api.onrender.com/api')).toBe(true);
  });

  it('clears legacy localStorage authToken', () => {
    localStorage.setItem('authToken', 'legacy');
    clearLegacyAuthTokenStorage();
    expect(localStorage.getItem('authToken')).toBeNull();
  });
});
