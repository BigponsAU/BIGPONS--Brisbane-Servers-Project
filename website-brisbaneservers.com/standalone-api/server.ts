import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';
type ApiContext = { request: Request; params: Record<string, string> };
type ApiHandler = (context: ApiContext) => Promise<Response> | Response;

interface RouteModule {
  GET?: ApiHandler;
  POST?: ApiHandler;
  PUT?: ApiHandler;
  PATCH?: ApiHandler;
  DELETE?: ApiHandler;
  OPTIONS?: ApiHandler;
}

interface RouteDefinition {
  methods: Partial<Record<HttpMethod, ApiHandler>>;
  params: string[];
  regex: RegExp;
  routePath: string;
  sourceFile: string;
  dynamicSegmentCount: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiPagesDir = path.resolve(__dirname, '../src/pages/api');
const port = Number(process.env.PORT ?? 3002);
const apiPrefix = '/api';
const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

function toPosixPath(value: string): string {
  return value.replace(/\\/g, '/');
}

async function walkApiFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walkApiFiles(fullPath));
      continue;
    }

    if (entry.isFile() && /\.(ts|js|mts|mjs)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

function compileRoute(relativeFile: string): { routePath: string; regex: RegExp; params: string[]; dynamicSegmentCount: number } {
  const withoutExtension = relativeFile.replace(/\.[^.]+$/, '');
  const rawSegments = withoutExtension.split('/');
  const segments = rawSegments[rawSegments.length - 1] === 'index' ? rawSegments.slice(0, -1) : rawSegments;
  const params: string[] = [];

  const routeParts = segments.map((segment) => {
    const dynamicMatch = /^\[(.+)\]$/.exec(segment);
    if (!dynamicMatch) {
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    params.push(dynamicMatch[1]);
    return '([^/]+)';
  });

  const routePath = `${apiPrefix}${routeParts.length ? `/${routeParts.join('/')}` : ''}`;
  const trailingSlashSafeRoute = routePath || apiPrefix;
  return {
    routePath: trailingSlashSafeRoute,
    regex: new RegExp(`^${trailingSlashSafeRoute}/?$`),
    params,
    dynamicSegmentCount: params.length,
  };
}

async function loadRoutes(): Promise<RouteDefinition[]> {
  const files = await walkApiFiles(apiPagesDir);
  const routes = await Promise.all(
    files.map(async (filePath) => {
      const relativeFile = toPosixPath(path.relative(apiPagesDir, filePath));
      try {
        const module = (await import(pathToFileURL(filePath).href)) as RouteModule;
        const methods = Object.fromEntries(
          httpMethods
            .filter((method) => typeof module[method] === 'function')
            .map((method) => [method, module[method] as ApiHandler])
        ) as Partial<Record<HttpMethod, ApiHandler>>;

        const compiled = compileRoute(relativeFile);
        return {
          ...compiled,
          methods,
          sourceFile: relativeFile,
        };
      } catch (error) {
        console.warn(`[Standalone API] Skipped route module ${relativeFile}:`, error);
        return null;
      }
    })
  );

  return routes
    .filter((route): route is RouteDefinition => route !== null && Object.keys(route.methods).length > 0)
    .sort((a, b) => {
      if (a.dynamicSegmentCount !== b.dynamicSegmentCount) {
        return a.dynamicSegmentCount - b.dynamicSegmentCount;
      }
      return b.routePath.length - a.routePath.length;
    });
}

function sendLiveness(
  res: ServerResponse,
  requestOrigin: string | null,
  routesReady: boolean
): void {
  sendJson(
    res,
    200,
    {
      status: routesReady ? 'ok' : 'starting',
      timestamp: new Date().toISOString(),
      routesReady,
    },
    requestOrigin
  );
}

function getAllowedOrigins(): string[] {
  const configured = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaults = [
    process.env.PUBLIC_SITE_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4321',
    'http://127.0.0.1:4321',
  ].filter((origin): origin is string => Boolean(origin));

  return [...new Set([...configured, ...defaults])];
}

function isCloudflarePagesOrigin(origin: string): boolean {
  const enabled =
    process.env.ALLOW_CLOUDFLARE_PAGES === '1' || process.env.ALLOW_CLOUDFLARE_PAGES === 'true';
  if (!enabled) {
    return false;
  }
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') {
      return false;
    }
    return url.hostname.endsWith('.pages.dev');
  } catch {
    return false;
  }
}

function resolveCorsOrigin(requestOrigin: string | null): string | null {
  const allowedOrigins = getAllowedOrigins();

  if (!requestOrigin) {
    return null;
  }

  if (allowedOrigins.includes('*')) {
    return '*';
  }

  if (allowedOrigins.includes(requestOrigin) || isCloudflarePagesOrigin(requestOrigin)) {
    return requestOrigin;
  }

  return null;
}

function applyCorsHeaders(response: ServerResponse, requestOrigin: string | null): void {
  const corsOrigin = resolveCorsOrigin(requestOrigin);

  if (corsOrigin) {
    response.setHeader('Access-Control-Allow-Origin', corsOrigin);
    response.setHeader('Vary', 'Origin');
  }

  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
}

async function readRequestBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return undefined;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) {
    return undefined;
  }

  return Buffer.concat(chunks);
}

function createRequestUrl(req: IncomingMessage): string {
  const host = req.headers.host ?? `localhost:${port}`;
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProto === 'string'
    ? forwardedProto.split(',')[0]
    : 'http';

  return `${protocol}://${host}${req.url ?? '/'}`;
}

function matchRoute(routes: RouteDefinition[], pathname: string): { route: RouteDefinition; params: Record<string, string> } | null {
  for (const route of routes) {
    const match = route.regex.exec(pathname);
    if (!match) {
      continue;
    }

    const params = route.params.reduce<Record<string, string>>((accumulator, param, index) => {
      accumulator[param] = decodeURIComponent(match[index + 1] ?? '');
      return accumulator;
    }, {});

    return { route, params };
  }

  return null;
}

async function sendResponse(nodeResponse: ServerResponse, response: Response, requestOrigin: string | null): Promise<void> {
  nodeResponse.statusCode = response.status;
  nodeResponse.statusMessage = response.statusText;

  response.headers.forEach((value, key) => {
    nodeResponse.setHeader(key, value);
  });

  applyCorsHeaders(nodeResponse, requestOrigin);

  const arrayBuffer = await response.arrayBuffer();
  nodeResponse.end(Buffer.from(arrayBuffer));
}

function sendJson(nodeResponse: ServerResponse, statusCode: number, payload: unknown, requestOrigin: string | null): void {
  nodeResponse.statusCode = statusCode;
  nodeResponse.setHeader('Content-Type', 'application/json');
  applyCorsHeaders(nodeResponse, requestOrigin);
  nodeResponse.end(JSON.stringify(payload));
}

// Non-blocking corpus bootstrap (Neon seed + file mirror). Avoid prestart hook — Render health checks need a fast listen.
void import('../scripts/bootstrap-voice-storage.ts').catch((error) => {
  console.warn('[Standalone API] bootstrap:storage failed:', error);
});

let routes: RouteDefinition[] = [];
let routesReady = false;

const server = createServer(async (req, res) => {
  const requestOrigin = typeof req.headers.origin === 'string' ? req.headers.origin : null;
  const requestUrl = createRequestUrl(req);
  const url = new URL(requestUrl);
  const method = (req.method ?? 'GET').toUpperCase() as HttpMethod;

  if (req.method === 'OPTIONS' && url.pathname.startsWith(apiPrefix)) {
    res.statusCode = 204;
    applyCorsHeaders(res, requestOrigin);
    res.end();
    return;
  }

  if (
    method === 'GET' &&
    (url.pathname === '/api/health' || url.pathname === '/api/test') &&
    !routesReady
  ) {
    sendLiveness(res, requestOrigin, false);
    return;
  }

  if (!routesReady) {
    sendJson(res, 503, { success: false, error: 'API routes loading', code: 'STARTING' }, requestOrigin);
    return;
  }

  const matched = matchRoute(routes, url.pathname);
  if (!matched) {
    sendJson(res, 404, { success: false, error: 'Not found', code: 'NOT_FOUND' }, requestOrigin);
    return;
  }

  const handler = matched.route.methods[method];

  if (!handler) {
    sendJson(res, 405, { success: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, requestOrigin);
    return;
  }

  try {
    const body = await readRequestBody(req);
    const request = new Request(requestUrl, {
      method,
      headers: req.headers as HeadersInit,
      body,
      duplex: body ? 'half' : undefined,
    } as RequestInit & { duplex?: 'half' });

    const response = await handler({
      request,
      params: matched.params,
    });

    await sendResponse(res, response, requestOrigin);
  } catch (error) {
    console.error(`[Standalone API] ${method} ${url.pathname} failed`, error);
    sendJson(
      res,
      500,
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected server error',
        code: 'INTERNAL_ERROR',
      },
      requestOrigin
    );
  }
});

const listenHost =
  process.env.API_LISTEN_HOST?.trim() ||
  (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

server.listen(port, listenHost, () => {
  console.log(`[Standalone API] Listening on http://${listenHost}:${port}`);
  console.log(`[Standalone API] Loading route modules from ${apiPagesDir}…`);

  void loadRoutes()
    .then((loaded) => {
      routes = loaded;
      routesReady = true;
      console.log(`[Standalone API] Mounted ${routes.length} Astro API route modules`);
      return import('../src/lib/library-growth/scheduler');
    })
    .then((mod) => {
      mod.startLibraryGrowthScheduler();
    })
    .catch((error) => {
      console.error('[Standalone API] Route load or scheduler failed:', error);
    });
});
