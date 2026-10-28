import type { InfographicSpec } from '../data/topic-guides/infographic-types';

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nodeShape(specId: string, node: InfographicSpec['nodes'][number]): string {
  const lines = node.label.split('\n');
  const label = lines
    .map((line, i) => `<tspan x="${node.x}" dy="${i === 0 ? 0 : 12}">${esc(line)}</tspan>`)
    .join('');
  if (node.kind === 'risk') {
    const s = 18;
    return `<g>
      <polygon points="${node.x},${node.y - s} ${node.x + s},${node.y} ${node.x},${node.y + s} ${node.x - s},${node.y}" fill="#fff8fa" stroke="#e879a9" stroke-width="1.25"/>
      <text x="${node.x}" y="${node.y + 4}" text-anchor="middle" font-size="10" fill="#9f1239">${label}</text>
    </g>`;
  }
  if (node.kind === 'outcome') {
    return `<g>
      <rect x="${node.x - 52}" y="${node.y - 16}" width="104" height="32" rx="16" fill="#ecfdf5" stroke="#059669" stroke-width="1.2"/>
      <text x="${node.x}" y="${node.y + 4}" text-anchor="middle" font-size="11" fill="#065f46">${label}</text>
    </g>`;
  }
  if (node.kind === 'hub') {
    return `<g>
      <circle cx="${node.x}" cy="${node.y}" r="34" fill="url(#ig-grad-${esc(specId)})"/>
      <text x="${node.x}" y="${node.y + 4}" text-anchor="middle" font-size="11" fill="#ffffff">${label}</text>
    </g>`;
  }
  return `<g>
    <rect x="${node.x - 48}" y="${node.y - 16}" width="96" height="32" rx="8" fill="#ffffff" stroke="#0a74da" stroke-width="1.2"/>
    <text x="${node.x}" y="${node.y + 4}" text-anchor="middle" font-size="11" fill="#0f172a">${label}</text>
  </g>`;
}

export function renderInfographicHtml(spec: InfographicSpec): string {
  const id = esc(spec.id);
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  const edges = spec.edges
    .map((edge) => {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      if (!from || !to) return '';
      return `<path d="M${from.x} ${from.y} L${to.x} ${to.y}" fill="none" stroke="#0A74DA" stroke-opacity="0.35" stroke-width="${edge.dashed ? 1.1 : 1.4}" ${edge.dashed ? 'stroke-dasharray="4 5"' : ''}/>`;
    })
    .join('');
  const nodes = spec.nodes.map((n) => nodeShape(spec.id, n)).join('');
  return `<figure class="workspace-diagram" data-diagram-id="${id}">
    <figcaption>
      <strong>${esc(spec.title)}</strong>
      ${spec.caption ? `<span> — ${esc(spec.caption)}</span>` : ''}
    </figcaption>
    <svg class="workspace-diagram__svg" viewBox="${esc(spec.viewBox || '0 0 800 300')}" role="img" aria-label="${esc(spec.description || spec.title)}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="ig-grad-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0A74DA"/>
          <stop offset="100%" stop-color="#5B6FD6"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="800" height="300" fill="#fafbfd"/>
      <rect x="20" y="20" width="760" height="260" rx="14" fill="#ffffff" stroke="#e2e8f0"/>
      ${edges}${nodes}
    </svg>
  </figure>`;
}

export function renderDiagramPlaceholderHtml(id: string, title?: string): string {
  return `<figure class="workspace-diagram-placeholder" data-diagram-id="${esc(id)}" contenteditable="false"><span>Diagram: ${esc(title || id)}</span></figure>`;
}
