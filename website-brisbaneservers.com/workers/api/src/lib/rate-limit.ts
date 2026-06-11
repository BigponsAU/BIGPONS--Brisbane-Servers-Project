const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (entry.count >= maxRequests) {
    return { ok: false, retryAfterMs: Math.max(0, entry.resetAt - now) };
  }
  entry.count += 1;
  return { ok: true };
}

export function authRateLimitResponse(
  request: Request,
  action: string,
  maxRequests: number,
  windowMs: number,
  cors: Record<string, string>
): Response | null {
  const clientKey = `${action}:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`;
  const result = checkRateLimit(clientKey, maxRequests, windowMs);
  if (result.ok) return null;

  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMITED',
      success: false,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
        ...cors,
      },
    }
  );
}
