import { describe, expect, it } from 'vitest';
import { pickNearestNodeId, projectClip } from '../src/scripts/voice-map-webgl';

function identityMvp(): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

describe('voice map WebGL picking', () => {
  it('projectClip applies column-major MVP', () => {
    const mvp = identityMvp();
    const clip = projectClip(mvp, 0.5, -0.25, 0.1);
    expect(clip.x).toBeCloseTo(0.5);
    expect(clip.y).toBeCloseTo(-0.25);
    expect(clip.z).toBeCloseTo(0.1);
    expect(clip.w).toBeCloseTo(1);
  });

  it('picks the nearest projected node within radius', () => {
    const mvp = identityMvp();
    // NDC (0,0) → screen centre of 200×100 → (100, 50)
    const nodes = [
      { id: 'far', x: 0.8, y: 0.8, z: 0 },
      { id: 'near', x: 0, y: 0, z: 0 },
    ];
    const hit = pickNearestNodeId(nodes, mvp, 100, 50, 200, 100, 20);
    expect(hit).toBe('near');
  });

  it('returns null when click is outside pick radius', () => {
    const mvp = identityMvp();
    const nodes = [{ id: 'hub', x: 0, y: 0, z: 0 }];
    const hit = pickNearestNodeId(nodes, mvp, 0, 0, 200, 100, 10);
    expect(hit).toBeNull();
  });

  it('prefers the front-most node on near ties', () => {
    const mvp = identityMvp();
    const nodes = [
      { id: 'back', x: 0, y: 0, z: 0.5 },
      { id: 'front', x: 0, y: 0, z: -0.5 },
    ];
    const hit = pickNearestNodeId(nodes, mvp, 100, 50, 200, 100, 20);
    expect(hit).toBe('front');
  });
});
