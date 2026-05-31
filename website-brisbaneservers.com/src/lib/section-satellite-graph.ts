/**
 * Deterministic Sierpinski-style graphs for section constellations (SSR-safe).
 * Mirrors the hero satellite language without DOM or Math.random().
 */

export type SectionSatelliteVariant =
  | 'strategy'
  | 'industry'
  | 'proof'
  | 'contact'
  | 'about'
  | 'challenge'
  | 'solutions'
  | 'partnership';

export type SatelliteNode = { x: number; y: number; level: number; size: number };

export type SatelliteEdge = { i: number; j: number };

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a-ish string hash for stable seeds across builds. */
export function hashSeedKey(parts: string[]): number {
  const s = parts.join('\0');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function collectNodes(
  centerX: number,
  centerY: number,
  level: number,
  maxLevel: number,
  rng: () => number,
  out: SatelliteNode[],
  phi: number,
  phiInv: number,
  span: number,
): void {
  if (level >= maxLevel) return;

  const size = span * 0.045 * phiInv ** level;
  const radius = span * 0.26 * phiInv ** (level + 1);

  if (level === 0) {
    out.push({ x: centerX, y: centerY, level, size: size * 1.35 });
  }

  const azimuthAngles = [23.6, 38.2, 61.8, 76.4];
  const numChildren = Math.min(4, Math.floor(phi * 2.5));

  for (let i = 0; i < numChildren; i++) {
    const jitter = (rng() - 0.5) * 10;
    const angleDeg = azimuthAngles[i % azimuthAngles.length] + i * (360 / numChildren) + jitter;
    const angle = (angleDeg * Math.PI) / 180;
    const childX = centerX + radius * Math.cos(angle);
    const childY = centerY + radius * Math.sin(angle);
    out.push({ x: childX, y: childY, level, size });

    collectNodes(childX, childY, level + 1, maxLevel, rng, out, phi, phiInv, span);
  }
}

/** Scale graph into viewBox with padding so SVG nodes never spill into page layout. */
function fitNodesToViewBox(
  nodes: SatelliteNode[],
  viewWidth: number,
  viewHeight: number,
  pad = 10,
): void {
  if (!nodes.length) return;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
  }

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const innerW = Math.max(viewWidth - pad * 2, 1);
  const innerH = Math.max(viewHeight - pad * 2, 1);
  const scale = Math.min(innerW / width, innerH / height, 1.15);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const targetCx = viewWidth * 0.5;
  const targetCy = viewHeight * 0.48;

  for (const n of nodes) {
    n.x = targetCx + (n.x - cx) * scale;
    n.y = targetCy + (n.y - cy) * scale;
    n.size *= scale;
  }
}

function findPhiEdges(
  nodes: SatelliteNode[],
  rng: () => number,
  maxPerNode: number,
  span: number,
): SatelliteEdge[] {
  const phi = 1.618;
  const edges: SatelliteEdge[] = [];
  const seen = new Set<string>();

  const pushEdge = (i: number, j: number) => {
    if (i === j) return;
    const a = Math.min(i, j);
    const b = Math.max(i, j);
    const key = `${a},${b}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ i: a, j: b });
  };

  nodes.forEach((node, i) => {
    type Cand = { j: number; distance: number; w: number };
    const cands: Cand[] = [];

    nodes.forEach((target, j) => {
      if (i === j) return;
      const distance = Math.hypot(node.x - target.x, node.y - target.y);
      const connectionRadius = span * 0.42 * phi ** -Math.abs(node.level - target.level);
      if (distance >= connectionRadius) return;
      const w = rng();
      if (w < 0.28) return;
      cands.push({ j, distance, w });
    });

    cands.sort((a, b) => a.distance - b.distance || a.w - b.w);
    cands.slice(0, maxPerNode).forEach((c) => pushEdge(i, c.j));
  });

  return edges;
}

export type BuildSectionSatelliteGraphParams = {
  /** Stable identity: variant + semantic slice, etc. */
  seedKey: string;
  viewWidth?: number;
  viewHeight?: number;
  /** Recursion depth (hero uses 4; sections stay lighter). */
  maxLevel?: number;
  /** Extra global rotation in degrees from seed (per-section character). */
  rotationDeg?: number;
};

/**
 * Builds node positions and edges in viewBox coordinates.
 */
export function buildSectionSatelliteGraph(params: BuildSectionSatelliteGraphParams): {
  nodes: SatelliteNode[];
  edges: SatelliteEdge[];
  viewWidth: number;
  viewHeight: number;
} {
  const viewWidth = params.viewWidth ?? 420;
  const viewHeight = params.viewHeight ?? 300;
  const maxLevel = params.maxLevel ?? 3;

  const seed = hashSeedKey([params.seedKey, String(viewWidth), String(viewHeight), String(maxLevel)]);
  const rng = mulberry32(seed);

  const phi = 1.618;
  const phiInv = 0.618;

  const centerX = viewWidth * 0.5;
  const centerY = viewHeight * 0.48;
  const span = Math.min(viewWidth, viewHeight);
  const nodes: SatelliteNode[] = [];
  collectNodes(centerX, centerY, 0, maxLevel, rng, nodes, phi, phiInv, span);

  const rotDeg =
    params.rotationDeg ??
    ((hashSeedKey([params.seedKey, 'rot']) % 23) - 11 + (hashSeedKey([params.seedKey, 'rot2']) % 7) - 3);
  const rot = rotDeg * (Math.PI / 180);
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  for (const n of nodes) {
    const dx = n.x - centerX;
    const dy = n.y - centerY;
    n.x = centerX + dx * cos - dy * sin;
    n.y = centerY + dx * sin + dy * cos;
  }

  fitNodesToViewBox(nodes, viewWidth, viewHeight);

  const edgeRng = mulberry32(hashSeedKey([params.seedKey, 'edges']));
  const edges = findPhiEdges(nodes, edgeRng, 3, span);

  return { nodes, edges, viewWidth, viewHeight };
}
