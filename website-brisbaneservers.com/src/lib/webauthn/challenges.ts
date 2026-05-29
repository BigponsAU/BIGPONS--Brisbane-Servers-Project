/** Short-lived WebAuthn challenges (single API instance; use Redis for multi-instance). */

interface StoredChallenge {
  challenge: string;
  userId?: string;
  email?: string;
  expiresAt: number;
}

const store = new Map<string, StoredChallenge>();
const TTL_MS = 5 * 60 * 1000;

export function saveChallenge(id: string, data: Omit<StoredChallenge, 'expiresAt'>): void {
  store.set(id, { ...data, expiresAt: Date.now() + TTL_MS });
}

export function consumeChallenge(id: string): StoredChallenge | null {
  const entry = store.get(id);
  if (!entry) return null;
  store.delete(id);
  if (Date.now() > entry.expiresAt) return null;
  return entry;
}

export function pruneChallenges(): void {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) store.delete(id);
  }
}
