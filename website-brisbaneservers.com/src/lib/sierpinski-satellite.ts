/** SSR + shared Sierpinski satellite geometry (deterministic — no Math.random). */

export interface SatelliteNode {
  x: number;
  y: number;
  level: number;
  size: number;
}

/**
 * Solid white marks for hero nodes — same roles as the original satellite set
 * (cog, rocket, database, shield, globe, box, tools, cloud, brain, bolt, lock,
 * branch, users, chart, plug). Filled silhouettes, not stroke glyphs, so they
 * still read at the small node sizes of the constellation.
 */
const SATELLITE_ICON_INNER = [
  '<path fill-rule="evenodd" d="M10.2 2.4h3.6l.35 1.85c.55.16 1.07.4 1.54.72l1.72-.7 2.55 4.4-1.42 1.18c.08.4.13.82.13 1.25s-.05.85-.13 1.25l1.42 1.18-2.55 4.4-1.72-.7a6.6 6.6 0 0 1-1.54.72L13.8 21.6h-3.6l-.35-1.85a6.6 6.6 0 0 1-1.54-.72l-1.72.7-2.55-4.4 1.42-1.18A6.3 6.3 0 0 1 5.3 12c0-.43.05-.85.13-1.25L4.01 9.57l2.55-4.4 1.72.7c.47-.32.99-.56 1.54-.72L10.2 2.4zm1.8 6.2a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"/>',
  '<path d="M14.2 2.2l1.3 4.6 4.3 1.2-4.1 2.2 1.6 5.1-4.3-2.8-3.8 3.2-.2-4.8-3.7-2.2 4.6-.6 2.3-5.9z"/><path d="M7.2 16.4c1.6 1.2 3.4 2 5.4 2.2l-.8 3.2c-2.6-.4-4.9-1.6-6.8-3.4l2.2-2z"/>',
  '<ellipse cx="12" cy="6.2" rx="7.2" ry="2.5"/><path d="M4.8 6.2v4.2c0 1.4 3.2 2.5 7.2 2.5s7.2-1.1 7.2-2.5V6.2"/><path d="M4.8 10.4v4.2c0 1.4 3.2 2.5 7.2 2.5s7.2-1.1 7.2-2.5v-4.2"/><path d="M4.8 14.6v3.2c0 1.4 3.2 2.5 7.2 2.5s7.2-1.1 7.2-2.5v-3.2"/>',
  '<path fill-rule="evenodd" d="M12 2.2l8 3.1v6.2c0 4.6-3.1 7.6-8 10.3-4.9-2.7-8-5.7-8-10.3V5.3l8-3.1zm0 4.5l-4.6 4.6 1.5 1.5L12 9.7l5.1 5.1 1.5-1.5L12 6.7z"/>',
  '<path fill-rule="evenodd" d="M12 2.2a9.8 9.8 0 1 1 0 19.6 9.8 9.8 0 0 1 0-19.6zm0 1.8c-1.7 2.1-2.6 4.7-2.6 8s.9 5.9 2.6 8c1.7-2.1 2.6-4.7 2.6-8s-.9-5.9-2.6-8zM4.6 11.1h14.8v1.8H4.6z"/>',
  '<path d="M7.2 4.4h9.6l.8 2.4H6.4l.8-2.4z"/><path d="M5.2 7.6h13.6v11.6H5.2z"/><path d="M9.4 12.2h5.2v7H9.4z" opacity="0.35"/>',
  '<path d="M16.8 3.4l3.8 3.8-2.1 2.1-3.8-3.8 2.1-2.1z"/><path d="M13.6 6.6l3.8 3.8-8.4 8.4H5.2v-3.8l8.4-8.4z"/><path d="M4.4 18.2l2.2-2.2 1.4 1.4-2.2 2.2z"/>',
  '<path d="M7.4 10.2a4.2 4.2 0 0 1 7.8-1.5 3.6 3.6 0 0 1 3.4 3.5H19a3.4 3.4 0 0 1 0 6.8H6.4a3.6 3.6 0 0 1-.4-7.2 4 4 0 0 1 1.4-1.6z"/>',
  '<path d="M8.4 7.2c1.1-1.6 2.4-2.4 3.6-2.4 1.3 0 2.5.8 3.6 2.4 1.6-.4 3.2.5 3.6 2.1.6 2.2-.4 4.5-2.4 6.1-.9.7-1.8 1.6-2.8 2.6h-4c-1-1-1.9-1.9-2.8-2.6-2-1.6-3-3.9-2.4-6.1.4-1.6 2-2.5 3.6-2.1z"/><path d="M9.4 11.2h2.1M12.5 11.2h2.1M9.8 13.6h4.4" fill="none" stroke="#1d4ed8" stroke-width="1.1" stroke-linecap="round"/>',
  '<path d="M13.4 2.2L6.2 13.2h4.2l-1.6 8.6 9.2-12.4h-4.6L13.4 2.2z"/>',
  '<path d="M12 2.8a3.6 3.6 0 0 1 3.6 3.6V9h1.8v12.2H6.6V9h1.8V6.4A3.6 3.6 0 0 1 12 2.8zm0 2.2a1.4 1.4 0 0 0-1.4 1.4V9h2.8V6.4A1.4 1.4 0 0 0 12 5z"/>',
  '<circle cx="7.2" cy="16.8" r="2.4"/><circle cx="12" cy="6.4" r="2.4"/><circle cx="17.6" cy="15.2" r="2.4"/><path d="M12 8.6v3.2c0 1.4-1.1 2.4-2.4 2.4H9.4"/><path d="M12 11.4c1.6 0 3.2.8 4.2 2.1"/>',
  '<circle cx="9" cy="7.4" r="2.6"/><circle cx="16.2" cy="8.2" r="2.1"/><path d="M3.8 19.2c.4-3.4 2.6-5.4 5.2-5.4 2.6 0 4.8 2 5.2 5.4"/><path d="M12.8 18.6c.5-2.2 2-3.6 3.6-3.6 1.8 0 3.2 1.4 3.6 3.6"/>',
  '<path d="M5 19.6h2.4V11H5v8.6zm5.2 0h2.4V6.4h-2.4v13.2zm5.2 0H18V8.8h-2.6v10.8z"/><path d="M4.4 19.6H19.6v1.8H4.4z"/>',
  '<path d="M9.2 3.2h1.8v3.4H9.2z"/><path d="M13 3.2h1.8v3.4H13z"/><path d="M8.2 6.8h7.6v4.6a4.2 4.2 0 0 1-3.8 4.2v5.2h-2V15.6a4.2 4.2 0 0 1-3.8-4.2V6.8z"/><path d="M6.2 9.2H8"/><path d="M16 9.2h1.8"/>',
] as const;

const PURPLE_GLOW_RGB = '139, 92, 246';
const BLUE_NODE = '#3b82f6';

function generateSierpinskiNodes(
  centerX: number,
  centerY: number,
  level: number,
  maxLevel: number,
): SatelliteNode[] {
  const nodes: SatelliteNode[] = [];
  const phi = 1.618;
  const phiInv = 0.618;

  if (level >= maxLevel) return nodes;

  const size = 20 * phiInv ** level;
  const radius = 100 * phi ** level;

  if (level === 0) {
    nodes.push({ x: centerX, y: centerY, level, size: size * 1.5 });
  }

  const azimuthAngles = [23.6, 38.2, 61.8, 76.4];
  const numChildren = Math.floor(phi * 3);

  for (let i = 0; i < numChildren; i += 1) {
    const angle = ((azimuthAngles[i % azimuthAngles.length] + (i * 360) / numChildren) * Math.PI) / 180;
    const childX = centerX + radius * Math.cos(angle);
    const childY = centerY + radius * Math.sin(angle);

    nodes.push({ x: childX, y: childY, level, size });
    nodes.push(...generateSierpinskiNodes(childX, childY, level + 1, maxLevel));
  }

  return nodes;
}

function findPhiConnections(node: SatelliteNode, allNodes: SatelliteNode[], currentIndex: number): SatelliteNode[] {
  const connections: SatelliteNode[] = [];
  const phi = 1.618;

  allNodes.forEach((targetNode, i) => {
    if (i === currentIndex) return;

    const distance = Math.hypot(node.x - targetNode.x, node.y - targetNode.y);
    const connectionRadius = 150 * phi ** -Math.abs(node.level - targetNode.level);
    const deterministicGate = (currentIndex * 17 + i * 31) % 100;

    if (distance < connectionRadius && deterministicGate > 52) {
      connections.push(targetNode);
    }
  });

  return connections.slice(0, 3);
}

function connectionMarkup(from: SatelliteNode, to: SatelliteNode, seq: number): string {
  const delay = ((seq % 24) * 0.18).toFixed(3);
  return [
    `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="rgba(${PURPLE_GLOW_RGB}, 0.24)" stroke-width="1.5" class="satellite-connection-base"></line>`,
    `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="rgba(${PURPLE_GLOW_RGB}, 0.62)" stroke-width="2.25" stroke-linecap="round" pathLength="100" stroke-dasharray="26 74" stroke-dashoffset="0" class="satellite-connection-pulse" style="--satellite-pulse-delay:${delay}s"></line>`,
  ].join('');
}

function nodeMarkup(node: SatelliteNode, iconInner: string, nodeIndex: number): string {
  const delay = ((nodeIndex % 20) * 0.35).toFixed(3);
  const haloR = node.size * 1.85;
  const ringR = node.size * 1.2;
  const iconSize = node.size * 0.8;
  const scale = iconSize / 24;

  return [
    `<g class="satellite-node" transform="translate(${node.x}, ${node.y})" style="--satellite-node-delay:${delay}s">`,
    `<circle r="${haloR}" fill="rgba(${PURPLE_GLOW_RGB}, 0.14)" class="satellite-neuron-halo"></circle>`,
    `<circle r="${ringR}" fill="white" opacity="0.9" class="satellite-node-ring"></circle>`,
    `<circle r="${node.size}" fill="${BLUE_NODE}" class="satellite-node-core"></circle>`,
    `<g class="satellite-node-icon" transform="translate(${-iconSize / 2},${-iconSize / 2}) scale(${scale})" fill="#fff" stroke="none" aria-hidden="true">`,
    iconInner,
    `</g>`,
    `</g>`,
  ].join('');
}

function computeViewBox(nodes: SatelliteNode[], padding = 32): string {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const margin = node.size * 2.4;
    minX = Math.min(minX, node.x - margin);
    minY = Math.min(minY, node.y - margin);
    maxX = Math.max(maxX, node.x + margin);
    maxY = Math.max(maxY, node.y + margin);
  }

  const x = minX - padding;
  const y = minY - padding;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  return `${x} ${y} ${width} ${height}`;
}

export function buildSierpinskiSatelliteMarkup(): {
  connections: string;
  nodes: string;
  viewBox: string;
} {
  const centerX = 400;
  const centerY = 300;

  const nodes = generateSierpinskiNodes(centerX, centerY, 0, 4);
  const viewBox = computeViewBox(nodes);

  const connectionParts: string[] = [];
  let connectionSeq = 0;

  nodes.forEach((node, index) => {
    findPhiConnections(node, nodes, index).forEach((targetNode) => {
      connectionParts.push(connectionMarkup(node, targetNode, connectionSeq));
      connectionSeq += 1;
    });
  });

  const nodeParts = nodes.map((node, index) =>
    nodeMarkup(node, SATELLITE_ICON_INNER[index % SATELLITE_ICON_INNER.length], index),
  );

  return {
    connections: connectionParts.join(''),
    nodes: nodeParts.join(''),
    viewBox,
  };
}
