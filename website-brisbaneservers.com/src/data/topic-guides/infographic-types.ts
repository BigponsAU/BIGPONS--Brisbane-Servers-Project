export type InfographicNodeKind = 'hub' | 'node' | 'outcome' | 'risk' | 'phase';

export interface InfographicNode {
  id: string;
  x: number;
  y: number;
  label: string;
  sublabel?: string;
  kind: InfographicNodeKind;
}

export interface InfographicEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface InfographicBadge {
  x: number;
  y: number;
  text: string;
}

export interface InfographicSpec {
  id: string;
  viewBox: string;
  title: string;
  caption: string;
  /** Long description for screen readers and SEO context. */
  description: string;
  nodes: InfographicNode[];
  edges: InfographicEdge[];
  badges?: InfographicBadge[];
}
