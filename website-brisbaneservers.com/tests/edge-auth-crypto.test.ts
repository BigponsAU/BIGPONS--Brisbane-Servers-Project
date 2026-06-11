import * as crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../workers/api/src/lib/auth-crypto';

const SALT_LEN = 16;
const KEY_LEN = 64;
const ITERATIONS = 100_000;
const DIGEST = 'sha512';

function nodeHashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

describe('edge auth crypto (Worker Web Crypto vs Node)', () => {
  it('verifies passwords hashed by Node pbkdf2', async () => {
    const password = 'test-password-Phase1b!';
    const stored = nodeHashPassword(password);
    expect(await verifyPassword(password, stored)).toBe(true);
    expect(await verifyPassword('wrong', stored)).toBe(false);
  });

  it('produces hashes Node can verify', async () => {
    const password = 'edge-worker-roundtrip';
    const stored = await hashPassword(password);
    const [salt, hash] = stored.split(':');
    const derived = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
    expect(derived).toBe(hash);
  });
});
