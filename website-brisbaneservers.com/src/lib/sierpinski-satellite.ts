/** SSR + shared Sierpinski satellite geometry (deterministic — no Math.random). */

export interface SatelliteNode {
  x: number;
  y: number;
  level: number;
  size: number;
}

const ICONS = [
  'fa-cog',
  'fa-rocket',
  'fa-database',
  'fa-shield-alt',
  'fa-globe',
  'fa-box',
  'fa-tools',
  'fa-cloud',
  'fa-brain',
  'fa-bolt',
  'fa-lock',
  'fa-code-branch',
  'fa-users',
  'fa-chart-bar',
  'fa-plug',
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

function nodeMarkup(node: SatelliteNode, iconClass: string, nodeIndex: number): string {
  const delay = ((nodeIndex % 20) * 0.35).toFixed(3);
  const haloR = node.size * 1.85;
  const ringR = node.size * 1.2;
  const iconSize = node.size * 0.8;

  return [
    `<g class="satellite-node" transform="translate(${node.x}, ${node.y})" style="--satellite-node-delay:${delay}s">`,
    `<circle r="${haloR}" fill="rgba(${PURPLE_GLOW_RGB}, 0.14)" class="satellite-neuron-halo"></circle>`,
    `<circle r="${ringR}" fill="white" opacity="0.9" class="satellite-node-ring"></circle>`,
    `<circle r="${node.size}" fill="${BLUE_NODE}" class="satellite-node-core"></circle>`,
    `<foreignObject x="${-node.size}" y="${-node.size}" width="${node.size * 2}" height="${node.size * 2}">`,
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:${iconSize}px"><i class="fas ${iconClass}" aria-hidden="true"></i></div>`,
    `</foreignObject>`,
    `</g>`,
  ].join('');
}

function computeViewBox(nodes: SatelliteNode[], padding = 52): string {
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
    nodeMarkup(node, ICONS[index % ICONS.length], index),
  );

  return {
    connections: connectionParts.join(''),
    nodes: nodeParts.join(''),
    viewBox,
  };
}
