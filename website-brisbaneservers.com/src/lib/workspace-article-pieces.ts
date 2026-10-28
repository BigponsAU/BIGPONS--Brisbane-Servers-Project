/** Insertable article pieces — the same compose model as diagrams. */

export type ArticlePieceKind = 'paragraph' | 'heading' | 'subheading' | 'list' | 'quote';

export type ArticlePieceNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ArticlePieceNode[];
  text?: string;
};

export function articlePieceTemplate(kind: ArticlePieceKind): ArticlePieceNode {
  switch (kind) {
    case 'heading':
      return { type: 'heading', attrs: { level: 2 } };
    case 'subheading':
      return { type: 'heading', attrs: { level: 3 } };
    case 'list':
      return {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
      };
    case 'quote':
      return { type: 'blockquote', content: [{ type: 'paragraph' }] };
    default:
      return { type: 'paragraph' };
  }
}

export function insertPieceAfter(
  nodes: ArticlePieceNode[],
  index: number,
  piece: ArticlePieceNode,
): ArticlePieceNode[] {
  const next = nodes.slice();
  const at = Math.min(Math.max(index + 1, 0), next.length);
  next.splice(at, 0, piece);
  return next;
}

export function movePiece(
  nodes: ArticlePieceNode[],
  index: number,
  direction: -1 | 1,
): ArticlePieceNode[] {
  const target = index + direction;
  if (index < 0 || index >= nodes.length || target < 0 || target >= nodes.length) {
    return nodes;
  }
  const next = nodes.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function duplicatePiece(nodes: ArticlePieceNode[], index: number): ArticlePieceNode[] {
  if (index < 0 || index >= nodes.length) return nodes;
  const next = nodes.slice();
  next.splice(index + 1, 0, structuredClone(nodes[index]));
  return next;
}

export function removePiece(nodes: ArticlePieceNode[], index: number): ArticlePieceNode[] {
  if (nodes.length <= 1) return [{ type: 'paragraph' }];
  if (index < 0 || index >= nodes.length) return nodes;
  const next = nodes.slice();
  next.splice(index, 1);
  return next.length ? next : [{ type: 'paragraph' }];
}
