import { describe, expect, it } from 'vitest';

/**
 * Regression: lazy stubs must invoke the real handler after chunk load.
 * Comparing against window[name] after replace always failed (fn === w[name]).
 */
describe('panel loader stub dispatch pattern', () => {
  it('invokes replacement when compared against captured stub', async () => {
    const calls: unknown[][] = [];
    const stub = (...args: unknown[]) => {
      void Promise.resolve().then(() => {
        const fn = (globalThis as { fn?: (...a: unknown[]) => void }).fn;
        if (typeof fn === 'function' && fn !== stub) {
          fn(...args);
        }
      });
    };

    (globalThis as { fn?: (...a: unknown[]) => void }).fn = stub;
    stub('first');

    const real = (...args: unknown[]) => {
      calls.push(args);
    };
    (globalThis as { fn?: (...a: unknown[]) => void }).fn = real;

    await Promise.resolve();
    expect(calls).toEqual([['first']]);
  });

  it('does not invoke when incorrectly comparing against window slot after replace', async () => {
    const w: Record<string, unknown> = {};
    const calls: unknown[][] = [];

    w.fn = (...args: unknown[]) => {
      void Promise.resolve().then(() => {
        const fn = w.fn;
        // Buggy pattern from before the fix
        if (typeof fn === 'function' && fn !== w.fn) {
          (fn as (...a: unknown[]) => void)(...args);
        }
      });
    };

    (w.fn as (...a: unknown[]) => void)('first');
    w.fn = (...args: unknown[]) => {
      calls.push(args);
    };

    await Promise.resolve();
    expect(calls).toEqual([]);
  });
});
