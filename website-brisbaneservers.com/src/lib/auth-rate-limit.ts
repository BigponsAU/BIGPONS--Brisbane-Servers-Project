import { checkRateLimit, getClientKey } from './rate-limit';

export function authRateLimitResponse(
  request: Request,
  action: string,
  maxRequests: number,
  windowMs: number
): Response | null {
  const clientKey = `${action}:${getClientKey(request)}`;
  const result = checkRateLimit(clientKey, maxRequests, windowMs);
  if (result.ok) {
    return null;
  }

  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMITED',
      success: false
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(result.retryAfterMs / 1000))
      }
    }
  );
}
