import { standaloneApiRoutes } from '../../../standalone-api/route-manifest';
import type { RouteDefinition } from '../../../standalone-api/astro-adapter';
import { corsHeaders, json } from './handlers';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

type CompiledRoute = {
  routePath: string;
  regex: RegExp;
  params: string[];
  dynamicSegmentCount: number;
  loadModule: RouteDefinition['loadModule'];
};

const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

let compiledRoutes: CompiledRoute[] | null = null;

function compileManifestPath(routePath: string): { regex: RegExp; params: string[]; dynamicSegmentCount: number } {
  const params: string[] = [];
  const parts = routePath.split('/').filter(Boolean);
  const regexParts = parts.map((part) => {
    if (part.startsWith(':')) {
      params.push(part.slice(1));
      return '([^/]+)';
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  const regex = new RegExp(`^/${regexParts.join('/')}/?$`);
  return { regex, params, dynamicSegmentCount: params.length };
}

function getCompiledRoutes(): CompiledRoute[] {
  if (compiledRoutes) {
    return compiledRoutes;
  }

  compiledRoutes = standaloneApiRoutes
    .map((route) => {
      const compiled = compileManifestPath(route.path);
      return {
        routePath: route.path,
        ...compiled,
        loadModule: route.loadModule,
      };
    })
    .sort((a, b) => {
      if (a.dynamicSegmentCount !== b.dynamicSegmentCount) {
        return a.dynamicSegmentCount - b.dynamicSegmentCount;
      }
      return b.routePath.length - a.routePath.length;
    });

  return compiledRoutes;
}

function matchRoute(pathname: string): { route: CompiledRoute; params: Record<string, string> } | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  for (const route of getCompiledRoutes()) {
    const match = route.regex.exec(normalized);
    if (!match) continue;
    const params = route.params.reduce<Record<string, string>>((acc, param, index) => {
      acc[param] = decodeURIComponent(match[index + 1] ?? '');
      return acc;
    }, {});
    return { route, params };
  }
  return null;
}

/** Routes handled natively in index.ts (not the Astro standalone manifest). */
const EDGE_NATIVE_PATHS = new Set([
  '/api/health',
  '/api/auth/wake',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/contact/inquiry',
]);

export async function dispatchStandaloneApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const apiPath = pathname.startsWith('/api') ? pathname : `/api${pathname}`;
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin);

  if (EDGE_NATIVE_PATHS.has(apiPath)) {
    return json({ success: false, error: 'Not found', code: 'NOT_FOUND' }, 404, cors);
  }

  const method = request.method.toUpperCase() as HttpMethod;
  if (!httpMethods.includes(method)) {
    return json({ success: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, cors);
  }

  const matched = matchRoute(apiPath);
  if (!matched) {
    return json({ success: false, error: 'Not found', code: 'NOT_FOUND' }, 404, cors);
  }

  try {
    const module = await matched.route.loadModule();
    const handler = module[method as keyof typeof module];
    if (typeof handler !== 'function') {
      return json({ success: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, cors);
    }

    const response = await handler({
      request,
      params: matched.params,
      url,
      clientAddress: 'edge',
      locals: {},
    });

    const outHeaders = new Headers(response.headers);
    Object.entries(cors).forEach(([key, value]) => outHeaders.set(key, value));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: outHeaders,
    });
  } catch (error) {
    console.error(`[edge-api] ${method} ${apiPath} failed`, error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected server error',
        code: 'INTERNAL_ERROR',
      },
      500,
      cors
    );
  }
}
