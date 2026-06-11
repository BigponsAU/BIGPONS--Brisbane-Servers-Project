import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { getVoiceFramework } from '../../../utils/voice-framework';
import { bootstrapVoiceCorpus } from '../../../lib/brisbane-profile';
import { getRuntimeEnv } from '../../../utils/runtime-env';

/**
 * Reindex publishable resources + rebuild Brisbane default profile.
 * POST /api/admin/bootstrap-voice-corpus
 * Optional header: Authorization Bearer (admin) or Bearer CRON_SECRET
 */
export const POST: APIRoute = async ({ request }) => {
  const cronSecret = getRuntimeEnv('CRON_SECRET');
  const authHeader = request.headers.get('authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  let authorized = false;
  if (cronSecret && bearer === cronSecret) {
    authorized = true;
  } else {
    const authResult = await requireAdmin(request);
    authorized = !('error' in authResult);
  }

  if (!authorized) {
    return new Response(
      JSON.stringify({ error: 'Forbidden', code: 'FORBIDDEN', success: false }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { profileManager, profileBuilder } = await getVoiceFramework();
    const result = await bootstrapVoiceCorpus(profileManager, profileBuilder);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Brisbane profile ${result.brisbane.created ? 'created' : 'updated'}; indexed ${result.indexed} resources.`,
        ...result,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code = message === 'NO_VOICE_SOURCE_CONTENT' ? 'NO_VOICE_SOURCE_CONTENT' : 'INTERNAL_ERROR';
    return new Response(
      JSON.stringify({ error: message, code, success: false }),
      { status: code === 'NO_VOICE_SOURCE_CONTENT' ? 404 : 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
