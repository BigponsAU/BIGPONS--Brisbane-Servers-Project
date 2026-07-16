/**
 * WebGL 3D voice topology renderer (orbit + pickable nodes).
 */

export type WebGlMapNode = {
  id: string;
  label?: string;
  x: number;
  y: number;
  z?: number;
  kind?: string;
  industry?: string;
};

export type WebGlMapEdge = {
  sourceId: string;
  targetId: string;
  strength?: number;
};

export type VoiceMapWebGlOptions = {
  selectedId?: string | null;
  onSelect?: (nodeId: string | null) => void;
  onActivate?: (nodeId: string) => void;
};

export type VoiceMapWebGlController = {
  render: () => void;
  destroy: () => void;
  setSelectedId: (id: string | null) => void;
};

type Vec3 = { x: number; y: number; z: number };

const INDUSTRY_RGB: Record<string, [number, number, number]> = {
  profile: [0.98, 0.45, 0.09],
  healthcare: [0.13, 0.77, 0.37],
  hospitality: [0.66, 0.33, 0.97],
  retail: [0.23, 0.51, 0.96],
  'professional-services': [0.05, 0.45, 0.85],
  manufacturing: [0.39, 0.45, 0.55],
  finance: [0.09, 0.64, 0.29],
  construction: [0.92, 0.35, 0.05],
  general: [0.58, 0.64, 0.72],
};

const HIGHLIGHT_RGB: [number, number, number] = [1, 0.92, 0.35];
const CLICK_DRAG_THRESHOLD_PX = 6;
const PICK_RADIUS_PX = 14;
const DBLCLICK_MS = 400;

function nodeZ(node: WebGlMapNode): number {
  if (typeof node.z === 'number') return node.z;
  if (node.kind === 'profile') return 24;
  if (node.kind === 'resource') return 12;
  if (node.kind === 'principle') return 18;
  return 6;
}

function nodeColor(node: WebGlMapNode): [number, number, number] {
  if (node.kind === 'profile') return INDUSTRY_RGB.profile;
  const key = (node.industry ?? 'general').toLowerCase().replace(/\s+/g, '-');
  return INDUSTRY_RGB[key] ?? INDUSTRY_RGB.general;
}

function nodePointSize(node: WebGlMapNode, selected: boolean): number {
  const base = node.kind === 'profile' ? 16 : node.kind === 'resource' ? 11 : 8;
  return selected ? base + 8 : base;
}

function normalizePositions(nodes: WebGlMapNode[]): Map<string, Vec3> {
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const out = new Map<string, Vec3>();
  for (const node of nodes) {
    const nx = ((node.x - minX) / spanX - 0.5) * 2.4;
    const ny = ((node.y - minY) / spanY - 0.5) * 2.4;
    const nz = (nodeZ(node) / 28) * 1.6 - 0.4;
    out.set(node.id, { x: nx, y: ny, z: nz });
  }
  return out;
}

function mat4Perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

function mat4Multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

function mat4RotateY(angle: number): Float32Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const out = new Float32Array(16);
  out[0] = c;
  out[2] = s;
  out[5] = 1;
  out[8] = -s;
  out[10] = c;
  out[15] = 1;
  return out;
}

function mat4RotateX(angle: number): Float32Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const out = new Float32Array(16);
  out[0] = 1;
  out[5] = c;
  out[6] = s;
  out[9] = -s;
  out[10] = c;
  out[15] = 1;
  return out;
}

function mat4Translate(x: number, y: number, z: number): Float32Array {
  const out = new Float32Array(16);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[12] = x;
  out[13] = y;
  out[14] = z;
  out[15] = 1;
  return out;
}

/** Project world point through column-major MVP → clip space. */
export function projectClip(mvp: Float32Array, x: number, y: number, z: number): {
  x: number;
  y: number;
  z: number;
  w: number;
} {
  return {
    x: mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12],
    y: mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13],
    z: mvp[2] * x + mvp[6] * y + mvp[10] * z + mvp[14],
    w: mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15],
  };
}

export function pickNearestNodeId(
  nodes: Array<{ id: string; x: number; y: number; z: number }>,
  mvp: Float32Array,
  cssX: number,
  cssY: number,
  cssWidth: number,
  cssHeight: number,
  radiusPx = PICK_RADIUS_PX,
): string | null {
  let bestId: string | null = null;
  let bestDist = radiusPx * radiusPx;
  let bestDepth = Infinity;

  for (const node of nodes) {
    const clip = projectClip(mvp, node.x, node.y, node.z);
    if (clip.w <= 0.001) continue;
    const ndcX = clip.x / clip.w;
    const ndcY = clip.y / clip.w;
    const ndcZ = clip.z / clip.w;
    if (ndcX < -1.2 || ndcX > 1.2 || ndcY < -1.2 || ndcY > 1.2 || ndcZ < -1.2 || ndcZ > 1.2) {
      continue;
    }
    const sx = (ndcX * 0.5 + 0.5) * cssWidth;
    const sy = (1 - (ndcY * 0.5 + 0.5)) * cssHeight;
    const dx = sx - cssX;
    const dy = sy - cssY;
    const dist2 = dx * dx + dy * dy;
    if (dist2 > bestDist) continue;
    if (dist2 < bestDist - 0.25 || (Math.abs(dist2 - bestDist) <= 0.25 && ndcZ < bestDepth)) {
      bestDist = dist2;
      bestDepth = ndcZ;
      bestId = node.id;
    }
  }
  return bestId;
}

const VERT = `#version 300 es
in vec3 a_position;
in vec3 a_color;
in float a_size;
uniform mat4 u_mvp;
out vec3 v_color;
void main() {
  gl_Position = u_mvp * vec4(a_position, 1.0);
  gl_PointSize = a_size;
  v_color = a_color;
}`;

const FRAG = `#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 outColor;
void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = dot(c, c);
  if (d > 0.25) discard;
  float rim = smoothstep(0.25, 0.12, d);
  outColor = vec4(v_color, 0.88 + 0.12 * rim);
}`;

const LINE_VERT = `#version 300 es
in vec3 a_position;
uniform mat4 u_mvp;
void main() {
  gl_Position = u_mvp * vec4(a_position, 1.0);
}`;

const LINE_FRAG = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 outColor;
void main() { outColor = u_color; }`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('shader create failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'shader compile failed');
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('program create failed');
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? 'program link failed');
  }
  return program;
}

export function mountVoiceMapWebGl(
  canvas: HTMLCanvasElement,
  nodes: WebGlMapNode[],
  edges: WebGlMapEdge[],
  options: VoiceMapWebGlOptions = {},
): VoiceMapWebGlController {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
  if (!gl) {
    throw new Error('WebGL2 not available');
  }
  const g = gl;

  const pointProgram = createProgram(g, VERT, FRAG);
  const lineProgram = createProgram(g, LINE_VERT, LINE_FRAG);
  const positions = normalizePositions(nodes);

  type RenderNode = { id: string; x: number; y: number; z: number; kind?: string; industry?: string };
  const renderNodes: RenderNode[] = [];
  for (const node of nodes) {
    const p = positions.get(node.id);
    if (!p) continue;
    const scale = node.kind === 'profile' ? 1.35 : 1;
    renderNodes.push({
      id: node.id,
      x: p.x * scale,
      y: p.y * scale,
      z: p.z * scale,
      kind: node.kind,
      industry: node.industry,
    });
  }

  let selectedId: string | null = options.selectedId ?? null;

  const pointVerts = new Float32Array(renderNodes.length * 3);
  const pointColors = new Float32Array(renderNodes.length * 3);
  const pointSizes = new Float32Array(renderNodes.length);

  function writePointAttributes(): void {
    for (let i = 0; i < renderNodes.length; i += 1) {
      const node = renderNodes[i];
      const selected = selectedId === node.id;
      pointVerts[i * 3] = node.x;
      pointVerts[i * 3 + 1] = node.y;
      pointVerts[i * 3 + 2] = node.z;
      const [r, gc, b] = selected ? HIGHLIGHT_RGB : nodeColor(node as WebGlMapNode);
      pointColors[i * 3] = r;
      pointColors[i * 3 + 1] = gc;
      pointColors[i * 3 + 2] = b;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      pointSizes[i] = nodePointSize(node as WebGlMapNode, selected) * dpr;
    }
  }

  writePointAttributes();

  const lineVerts: number[] = [];
  for (const edge of edges) {
    const a = positions.get(edge.sourceId);
    const b = positions.get(edge.targetId);
    if (!a || !b) continue;
    lineVerts.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }

  const pointVbo = g.createBuffer();
  const colorVbo = g.createBuffer();
  const sizeVbo = g.createBuffer();
  const lineVbo = g.createBuffer();

  function uploadPointBuffers(): void {
    g.bindBuffer(g.ARRAY_BUFFER, pointVbo);
    g.bufferData(g.ARRAY_BUFFER, pointVerts, g.DYNAMIC_DRAW);
    g.bindBuffer(g.ARRAY_BUFFER, colorVbo);
    g.bufferData(g.ARRAY_BUFFER, pointColors, g.DYNAMIC_DRAW);
    g.bindBuffer(g.ARRAY_BUFFER, sizeVbo);
    g.bufferData(g.ARRAY_BUFFER, pointSizes, g.DYNAMIC_DRAW);
  }

  uploadPointBuffers();
  g.bindBuffer(g.ARRAY_BUFFER, lineVbo);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array(lineVerts), g.STATIC_DRAW);

  let rotX = -0.35;
  let rotY = 0.55;
  let distance = 4.2;
  let dragging = false;
  let movedDuringDrag = false;
  let lastX = 0;
  let lastY = 0;
  let pointerDownX = 0;
  let pointerDownY = 0;
  let lastClickAt = 0;
  let lastClickId: string | null = null;
  let raf = 0;
  let lastMvp = mat4Perspective(Math.PI / 4, 1, 0.1, 100);

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    dragging = true;
    movedDuringDrag = false;
    lastX = e.clientX;
    lastY = e.clientY;
    pointerDownX = e.clientX;
    pointerDownY = e.clientY;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if (Math.abs(e.clientX - pointerDownX) > CLICK_DRAG_THRESHOLD_PX
      || Math.abs(e.clientY - pointerDownY) > CLICK_DRAG_THRESHOLD_PX) {
      movedDuringDrag = true;
    }
    rotY += dx * 0.008;
    rotX += dy * 0.008;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    lastX = e.clientX;
    lastY = e.clientY;
    scheduleRender();
  };

  const onPointerUp = (e: PointerEvent) => {
    const wasDrag = movedDuringDrag;
    dragging = false;
    canvas.style.cursor = 'grab';
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    if (wasDrag || e.button !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const hitId = pickNearestNodeId(
      renderNodes,
      lastMvp,
      cssX,
      cssY,
      rect.width,
      rect.height,
    );

    const now = Date.now();
    const isDouble =
      hitId != null
      && hitId === lastClickId
      && now - lastClickAt <= DBLCLICK_MS;

    if (isDouble && hitId) {
      options.onActivate?.(hitId);
      lastClickAt = 0;
      lastClickId = null;
      return;
    }

    lastClickAt = now;
    lastClickId = hitId;
    options.onSelect?.(hitId);
    setSelectedId(hitId);
  };

  const onPointerCancel = (e: PointerEvent) => {
    dragging = false;
    canvas.style.cursor = 'grab';
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    distance = Math.max(2.2, Math.min(8.5, distance + e.deltaY * 0.004));
    scheduleRender();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.style.cursor = 'grab';
  canvas.title = 'Drag to orbit · Click to inspect · Double-click to open · Scroll to zoom';

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 480;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    g.viewport(0, 0, canvas.width, canvas.height);
  }

  function buildMvp(): Float32Array {
    const aspect = canvas.width / Math.max(canvas.height, 1);
    const proj = mat4Perspective(Math.PI / 4, aspect, 0.1, 100);
    const view = mat4Translate(0, 0, -distance);
    const rot = mat4Multiply(mat4RotateY(rotY), mat4RotateX(rotX));
    return mat4Multiply(proj, mat4Multiply(view, rot));
  }

  function render(): void {
    resize();
    writePointAttributes();
    uploadPointBuffers();

    g.clearColor(0.04, 0.06, 0.09, 1);
    g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
    g.enable(g.DEPTH_TEST);
    g.enable(g.BLEND);
    g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);

    lastMvp = buildMvp();

    if (lineVerts.length >= 6) {
      g.useProgram(lineProgram);
      const uMvp = g.getUniformLocation(lineProgram, 'u_mvp');
      const uColor = g.getUniformLocation(lineProgram, 'u_color');
      g.uniformMatrix4fv(uMvp, false, lastMvp);
      g.uniform4f(uColor, 0.45, 0.55, 0.7, 0.22);
      g.bindBuffer(g.ARRAY_BUFFER, lineVbo);
      const loc = g.getAttribLocation(lineProgram, 'a_position');
      g.enableVertexAttribArray(loc);
      g.vertexAttribPointer(loc, 3, g.FLOAT, false, 0, 0);
      g.drawArrays(g.LINES, 0, lineVerts.length / 3);
    }

    if (renderNodes.length > 0) {
      g.useProgram(pointProgram);
      const uMvp = g.getUniformLocation(pointProgram, 'u_mvp');
      g.uniformMatrix4fv(uMvp, false, lastMvp);

      g.bindBuffer(g.ARRAY_BUFFER, pointVbo);
      const posLoc = g.getAttribLocation(pointProgram, 'a_position');
      g.enableVertexAttribArray(posLoc);
      g.vertexAttribPointer(posLoc, 3, g.FLOAT, false, 0, 0);

      g.bindBuffer(g.ARRAY_BUFFER, colorVbo);
      const colLoc = g.getAttribLocation(pointProgram, 'a_color');
      g.enableVertexAttribArray(colLoc);
      g.vertexAttribPointer(colLoc, 3, g.FLOAT, false, 0, 0);

      g.bindBuffer(g.ARRAY_BUFFER, sizeVbo);
      const sizeLoc = g.getAttribLocation(pointProgram, 'a_size');
      g.enableVertexAttribArray(sizeLoc);
      g.vertexAttribPointer(sizeLoc, 1, g.FLOAT, false, 0, 0);

      g.drawArrays(g.POINTS, 0, renderNodes.length);
    }
  }

  function scheduleRender(): void {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  }

  function setSelectedId(id: string | null): void {
    if (selectedId === id) {
      scheduleRender();
      return;
    }
    selectedId = id;
    scheduleRender();
  }

  scheduleRender();

  return {
    render,
    setSelectedId,
    destroy: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('wheel', onWheel);
      canvas.style.cursor = '';
      canvas.title = '';
      g.deleteProgram(pointProgram);
      g.deleteProgram(lineProgram);
    },
  };
}
