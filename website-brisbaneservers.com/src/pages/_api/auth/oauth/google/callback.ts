import type { APIRoute } from 'astro';
import { completeGoogleOAuth } from '~/lib/oauth/google';
import { getRuntimeEnv } from '~/utils/runtime-env';
import { resolvePublicSitePath } from '~/lib/api-config';

/** GET /api/auth/oauth/google/callback — exchange code, create session, redirect to /account/ */
export const GET: APIRoute = async ({ request, url }) => {
  const accountUrl = `${(getRuntimeEnv('PUBLIC_SITE_URL') ?? 'https://brisbaneservers.com').replace(/\/$/, '')}${resolvePublicSitePath('/account/')}`;
  const error = url.searchParams.get('error');
  if (error) {
    return Response.redirect(`${accountUrl}?oauth_error=${encodeURIComponent(error)}`, 302);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    return new Response('Missing OAuth code or state', { status: 400 });
  }

  return completeGoogleOAuth(request, code, state);
};
