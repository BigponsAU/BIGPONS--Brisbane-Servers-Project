/**
 * WebGL 3D voice topology renderer (orbit + instanced nodes).
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

const VERT = `#version 300 es
in vec3 a_position;
in vec3 a_color;
uniform mat4 u_mvp;
out vec3 v_color;
void main() {
  gl_Position = u_mvp * vec4(a_position, 1.0);
  gl_PointSize = 8.0;
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
  outColor = vec4(v_color, 0.92);
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

export type VoiceMapWebGlController = {
  render: () => void;
  destroy: () => void;
};

export function mountVoiceMapWebGl(
  canvas: HTMLCanvasElement,
  nodes: WebGlMapNode[],
  edges: WebGlMapEdge[]
): VoiceMapWebGlController {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
  if (!gl) {
    throw new Error('WebGL2 not available');
  }
  const g = gl;

  const pointProgram = createProgram(g, VERT, FRAG);
  const lineProgram = createProgram(g, LINE_VERT, LINE_FRAG);
  const positions = normalizePositions(nodes);

  const pointVerts: number[] = [];
  const pointColors: number[] = [];
  for (const node of nodes) {
    const p = positions.get(node.id);
    if (!p) continue;
    const [r, g, b] = nodeColor(node);
    const scale = node.kind === 'profile' ? 1.35 : 1;
    pointVerts.push(p.x * scale, p.y * scale, p.z * scale);
    pointColors.push(r, g, b);
  }

  const lineVerts: number[] = [];
  for (const edge of edges) {
    const a = positions.get(edge.sourceId);
    const b = positions.get(edge.targetId);
    if (!a || !b) continue;
    lineVerts.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }

  const pointVbo = g.createBuffer();
  const colorVbo = g.createBuffer();
  const lineVbo = g.createBuffer();

  g.bindBuffer(g.ARRAY_BUFFER, pointVbo);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array(pointVerts), g.STATIC_DRAW);
  g.bindBuffer(g.ARRAY_BUFFER, colorVbo);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array(pointColors), g.STATIC_DRAW);
  g.bindBuffer(g.ARRAY_BUFFER, lineVbo);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array(lineVerts), g.STATIC_DRAW);

  let rotX = -0.35;
  let rotY = 0.55;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let raf = 0;

  const onPointerDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.008;
    rotX += (e.clientY - lastY) * 0.008;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    lastX = e.clientX;
    lastY = e.clientY;
    scheduleRender();
  };
  const onPointerUp = (e: PointerEvent) => {
    dragging = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerUp);

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 480;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    g.viewport(0, 0, canvas.width, canvas.height);
  }

  function render(): void {
    resize();
    g.clearColor(0.04, 0.06, 0.09, 1);
    g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
    g.enable(g.DEPTH_TEST);

    const aspect = canvas.width / canvas.height;
    const proj = mat4Perspective(Math.PI / 4, aspect, 0.1, 100);
    const view = mat4Translate(0, 0, -4.2);
    const rot = mat4Multiply(mat4RotateY(rotY), mat4RotateX(rotX));
    const mvp = mat4Multiply(proj, mat4Multiply(view, rot));

    if (lineVerts.length >= 6) {
      g.useProgram(lineProgram);
      const uMvp = g.getUniformLocation(lineProgram, 'u_mvp');
      const uColor = g.getUniformLocation(lineProgram, 'u_color');
      g.uniformMatrix4fv(uMvp, false, mvp);
      g.uniform4f(uColor, 0.45, 0.55, 0.7, 0.22);
      g.bindBuffer(g.ARRAY_BUFFER, lineVbo);
      const loc = g.getAttribLocation(lineProgram, 'a_position');
      g.enableVertexAttribArray(loc);
      g.vertexAttribPointer(loc, 3, g.FLOAT, false, 0, 0);
      g.drawArrays(g.LINES, 0, lineVerts.length / 3);
    }

    if (pointVerts.length >= 3) {
      g.useProgram(pointProgram);
      const uMvp = g.getUniformLocation(pointProgram, 'u_mvp');
      g.uniformMatrix4fv(uMvp, false, mvp);
      g.bindBuffer(g.ARRAY_BUFFER, pointVbo);
      const posLoc = g.getAttribLocation(pointProgram, 'a_position');
      g.enableVertexAttribArray(posLoc);
      g.vertexAttribPointer(posLoc, 3, g.FLOAT, false, 0, 0);
      g.bindBuffer(g.ARRAY_BUFFER, colorVbo);
      const colLoc = g.getAttribLocation(pointProgram, 'a_color');
      g.enableVertexAttribArray(colLoc);
      g.vertexAttribPointer(colLoc, 3, g.FLOAT, false, 0, 0);
      g.drawArrays(g.POINTS, 0, pointVerts.length / 3);
    }
  }

  function scheduleRender(): void {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  }

  scheduleRender();

  return {
    render,
    destroy: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
      g.deleteProgram(pointProgram);
      g.deleteProgram(lineProgram);
    },
  };
}
