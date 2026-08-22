/**
 * Filled constellation marks for hero satellite nodes.
 * Drawn for 24×24, optically padded, evenodd counters so the blue core shows through.
 * Silhouettes stay distinct down to ~6px (smallest nodes in the field).
 */

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function n(value: number): string {
  return value.toFixed(2);
}

function evenoddPath(d: string): string {
  return `<path fill-rule="evenodd" d="${d}"/>`;
}

function gear(): string {
  const cx = 12;
  const cy = 12;
  const teeth = 8;
  const outer = 10.15;
  const inner = 7.15;
  const hole = 3.15;
  const span = 360 / teeth;
  const tip = 0.34;
  let d = '';

  for (let i = 0; i < teeth; i += 1) {
    const base = -90 + i * span;
    const points: Array<[number, number]> = [
      polar(cx, cy, inner, base + span * 0.1),
      polar(cx, cy, outer, base + span * (0.5 - tip / 2)),
      polar(cx, cy, outer, base + span * (0.5 + tip / 2)),
      polar(cx, cy, inner, base + span * 0.9),
    ];
    points.forEach(([x, y], index) => {
      d += `${i === 0 && index === 0 ? 'M' : 'L'}${n(x)} ${n(y)}`;
    });
  }
  d += 'Z';
  d += `M${n(cx + hole)} ${n(cy)}a${hole} ${hole} 0 1 1 ${n(-2 * hole)} 0a${hole} ${hole} 0 1 1 ${n(2 * hole)} 0z`;
  return evenoddPath(d);
}

function rocket(): string {
  return evenoddPath(
    [
      'M12 1.85c.38 0 .74.17.96.48l5.05 7.55c.36.54-.02 1.27-.66 1.27h-2.12l.92 8.05c.07.66-.72 1.06-1.2.6L12 17.55 8.05 19.8c-.48.46-1.27.06-1.2-.6l.92-8.05H5.65c-.64 0-1.02-.73-.66-1.27l5.05-7.55c.22-.31.58-.48.96-.48z',
      'M12 7.05a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
    ].join(''),
  );
}

function database(): string {
  return [
    '<ellipse cx="12" cy="6.05" rx="8.1" ry="2.55"/>',
    '<path d="M3.9 6.05v4.15c0 1.42 3.62 2.55 8.1 2.55s8.1-1.13 8.1-2.55V6.05"/>',
    '<path d="M3.9 10.2v4.15c0 1.42 3.62 2.55 8.1 2.55s8.1-1.13 8.1-2.55V10.2"/>',
    '<path d="M3.9 14.35v3.55c0 1.42 3.62 2.55 8.1 2.55s8.1-1.13 8.1-2.55v-3.55"/>',
    '<ellipse cx="12" cy="10.2" rx="8.1" ry="2.55" opacity="0.35"/>',
    '<ellipse cx="12" cy="14.35" rx="8.1" ry="2.55" opacity="0.28"/>',
  ].join('');
}

function shield(): string {
  return evenoddPath(
    [
      'M12 2.15c.28 0 .56.06.82.16l7.38 2.92c.5.2.8.68.8 1.22v5.7c0 5.05-3.42 8.28-8.5 10.55a1.3 1.3 0 0 1-1 0C6.42 20.43 3 17.2 3 12.15v-5.7c0-.54.3-1.02.8-1.22l7.38-2.92c.26-.1.54-.16.82-.16z',
      'M10.62 12.08 8.4 9.86a.95.95 0 0 0-1.34 1.34l2.9 2.9c.37.37.97.37 1.34 0l5.62-5.62a.95.95 0 1 0-1.34-1.34l-4.96 4.94z',
    ].join(''),
  );
}

function globe(): string {
  return evenoddPath(
    [
      'M12 2.2a9.8 9.8 0 1 1 0 19.6 9.8 9.8 0 0 1 0-19.6z',
      'M12 4.55c-1.82 2.15-2.78 4.7-2.78 7.45s.96 5.3 2.78 7.45c1.82-2.15 2.78-4.7 2.78-7.45s-.96-5.3-2.78-7.45z',
      'M4.35 11.1h15.3v1.8H4.35z',
    ].join(''),
  );
}

function cube(): string {
  return [
    '<path d="M12 3.1 20.6 8.05 12 13 3.4 8.05 12 3.1z"/>',
    '<path d="M3.4 8.05 12 13v8.05L3.4 16.1V8.05z" opacity="0.78"/>',
    '<path d="M12 13 20.6 8.05V16.1L12 21.05V13z" opacity="0.55"/>',
  ].join('');
}

function wrench(): string {
  return evenoddPath(
    [
      'M19.7 4.35a3.55 3.55 0 0 0-5.72 4.05L8.6 13.78 5.05 10.23l-1.7 1.7 3.55 3.55-2.7 2.7v2.95h2.95l2.7-2.7 3.55 3.55 1.7-1.7-3.55-3.55 5.38-5.38a3.55 3.55 0 0 0 3.77-6z',
      'M17.55 6.2a1.7 1.7 0 1 1-2.4 2.4 1.7 1.7 0 0 1 2.4-2.4z',
    ].join(''),
  );
}

function cloud(): string {
  return '<path d="M8.05 9.35A4.7 4.7 0 0 1 16.7 8.4 4.05 4.05 0 0 1 20.4 12c0 .18-.01.35-.04.52A3.85 3.85 0 0 1 19.6 20.1H7.15A4.35 4.35 0 0 1 3.4 14.4c0-.38.05-.75.14-1.1A4.7 4.7 0 0 1 8.05 9.35z"/>';
}

function neuron(): string {
  return [
    '<circle cx="12" cy="5.6" r="2.85"/>',
    '<circle cx="6.15" cy="16.7" r="2.7"/>',
    '<circle cx="17.85" cy="16.7" r="2.7"/>',
    '<path d="M10.7 7.85 7.55 14.35h1.9L12 9.05z"/>',
    '<path d="M13.3 7.85 16.45 14.35h-1.9L12 9.05z"/>',
    '<path d="M8.85 16.7h6.3v1.55H8.85z"/>',
  ].join('');
}

function bolt(): string {
  return '<path d="M13.55 2.2 6.15 13.05c-.42.62.03 1.45.78 1.45h3.42l-1.08 7.08c-.12.8.86 1.28 1.4.68l8.05-8.95c.5-.56.1-1.48-.64-1.48h-3.7l2.02-8.15c.18-.74-.7-1.22-1.25-.86z"/>';
}

function lock(): string {
  return evenoddPath(
    [
      'M12 2.8c2.62 0 4.75 2.13 4.75 4.75V9.3h1.7c.86 0 1.55.7 1.55 1.55v8.8c0 .86-.7 1.55-1.55 1.55H6.55A1.55 1.55 0 0 1 5 19.65v-8.8c0-.86.7-1.55 1.55-1.55h1.7V7.55C8.25 4.93 10.38 2.8 12 2.8zm0 2.15A2.6 2.6 0 0 0 9.4 7.55V9.3h5.2V7.55A2.6 2.6 0 0 0 12 4.95z',
      'M12 13.15a1.55 1.55 0 0 0-.7 2.92V17.9h1.4v-1.83A1.55 1.55 0 0 0 12 13.15z',
    ].join(''),
  );
}

function branch(): string {
  return [
    '<circle cx="12" cy="5.55" r="2.65"/>',
    '<circle cx="6.2" cy="18.2" r="2.55"/>',
    '<circle cx="17.8" cy="18.2" r="2.55"/>',
    '<path d="M11.15 8.05v4.35c0 1.7-1.35 3.05-3.05 3.05H8.4v1.7h.05c2.7 0 4.9-2.2 4.9-4.9V8.05h-2.2z"/>',
    '<path d="M12.85 8.05v3.55c0 2.7 2.2 4.9 4.9 4.9h.05v-1.7h-.3c-1.7 0-3.05-1.35-3.05-3.05V8.05h-1.6z"/>',
  ].join('');
}

function users(): string {
  return [
    '<circle cx="8.55" cy="7.35" r="3.05"/>',
    '<path d="M2.7 19.7c.35-3.72 2.7-5.95 5.85-5.95 3.15 0 5.5 2.23 5.85 5.95"/>',
    '<circle cx="16.35" cy="8.15" r="2.45"/>',
    '<path d="M12.85 19.7c.4-2.55 2-4.15 3.7-4.15 1.85 0 3.4 1.55 3.75 4.15"/>',
  ].join('');
}

function chart(): string {
  return [
    '<path d="M4.7 19.85h2.85V11.1H4.7v8.75z"/>',
    '<path d="M10.55 19.85h2.9V6.2h-2.9v13.65z"/>',
    '<path d="M16.45 19.85h2.85V9.05h-2.85v10.8z"/>',
    '<path d="M3.9 19.85H20.1v1.7H3.9z"/>',
  ].join('');
}

function plug(): string {
  return evenoddPath(
    [
      'M9.05 2.4h1.9v3.55H9.05V2.4zm4 0h1.9v3.55h-1.9V2.4z',
      'M7.55 6.1h8.9v5.15a4.55 4.55 0 0 1-3.55 4.44v5.91h-1.8v-5.91A4.55 4.55 0 0 1 7.55 11.25V6.1z',
      'M12 9.05a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7z',
    ].join(''),
  );
}

export const CONSTELLATION_ICON_NAMES = [
  'gear',
  'rocket',
  'database',
  'shield',
  'globe',
  'cube',
  'wrench',
  'cloud',
  'neuron',
  'bolt',
  'lock',
  'branch',
  'users',
  'chart',
  'plug',
] as const;

export type ConstellationIconName = (typeof CONSTELLATION_ICON_NAMES)[number];

export const CONSTELLATION_ICON_INNER: Record<ConstellationIconName, string> = {
  gear: gear(),
  rocket: rocket(),
  database: database(),
  shield: shield(),
  globe: globe(),
  cube: cube(),
  wrench: wrench(),
  cloud: cloud(),
  neuron: neuron(),
  bolt: bolt(),
  lock: lock(),
  branch: branch(),
  users: users(),
  chart: chart(),
  plug: plug(),
};

export const CONSTELLATION_ICONS: string[] = CONSTELLATION_ICON_NAMES.map(
  (name) => CONSTELLATION_ICON_INNER[name],
);
