import type { Express, Request, Response } from 'express';

type AstroMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type AstroHandler = (context: { request: Request; params: Record<string, string | undefined> }) => Promise<Response> | Response;

export interface AstroRouteModule {
  GET?: AstroHandler;
  POST?: AstroHandler;
  PUT?: AstroHandler;
  PATCH?: AstroHandler;
  DELETE?: AstroHandler;
}

export interface RouteDefinition {
  path: string;
  loadModule: () => Promise<AstroRouteModule>;
}

function toHeaders(req: Request): Headers {
  const headers = new Headers();

  Object.entries(req.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry));
      return;
    }
    if (typeof value === 'string') {
      headers.set(key, value);
    }
  });

  return headers;
}

function createRequest(req: Request): globalThis.Request {
  const origin = `${req.protocol}://${req.get('host')}`;
  const url = new URL(req.originalUrl, origin);
  const method = req.method.toUpperCase();
  const headers = toHeaders(req);
  const hasBody = method !== 'GET' && method !== 'HEAD' && Buffer.isBuffer(req.body) && req.body.length > 0;

  return new globalThis.Request(url, {
    method,
    headers,
    body: hasBody ? req.body : undefined,
    duplex: hasBody ? 'half' : undefined,
  } as RequestInit & { duplex?: 'half' });
}

async function writeResponse(target: Response, source: globalThis.Response): Promise<void> {
  target.status(source.status);

  source.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      target.append('Set-Cookie', value);
      return;
    }
    target.setHeader(key, value);
  });

  if (source.status === 204 || source.status === 304) {
    target.end();
    return;
  }

  const body = Buffer.from(await source.arrayBuffer());
  target.send(body);
}

export function registerAstroRoutes(app: Express, routes: RouteDefinition[]): void {
  routes.forEach(({ path, loadModule }) => {
    (['get', 'post', 'put', 'patch', 'delete'] as const).forEach((expressMethod) => {
      app[expressMethod](path, async (req, res) => {
        try {
          const module = await loadModule();
          const handler = module[expressMethod.toUpperCase() as AstroMethod];

          if (!handler) {
            res.status(405).json({ error: 'Method not allowed' });
            return;
          }

          const request = createRequest(req);
          const response = await handler({ request, params: req.params });
          await writeResponse(res, response);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unexpected API adapter failure';
          res.status(500).json({ error: message, success: false });
        }
      });
    });
  });
}
