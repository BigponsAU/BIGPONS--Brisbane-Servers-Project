import type { APIRoute } from 'astro';
import { Extrapolator } from '@voice-framework';
import { requireEditor } from '../../../utils/auth';
import { getVoiceFramework } from '../../../utils/voice-framework';
import { resolveResourceVoiceProfile } from '../../../lib/resource-voice-profile';
import { loadResources } from '../../../lib/resources-api';

/**
 * Voice extrapolation — Markov debug chain analysis and general text expansion.
 * POST /api/voice/extrapolate
 */
export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireEditor(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: authResult.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (text.length < 20) {
      return new Response(
        JSON.stringify({ error: 'Text must be at least 20 characters', code: 'TEXT_TOO_SHORT', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (text.length > 50000) {
      return new Response(
        JSON.stringify({ error: 'Text exceeds 50,000 characters', code: 'TEXT_TOO_LONG', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resources = await loadResources();
    const { profileManager, profileBuilder } = await getVoiceFramework();
    const resolved = await resolveResourceVoiceProfile({
      requestedProfileId: typeof body?.profileId === 'string' ? body.profileId : undefined,
      profileManager,
      profileBuilder,
      resources,
    });

    const extrapolator = new Extrapolator(resolved.profile);
    const options =
      body?.options && typeof body.options === 'object'
        ? (body.options as { expansionLevel?: string; addExamples?: boolean; addDetails?: boolean })
        : {};
    const extrapolated = extrapolator.extrapolate(text, {
      expansionLevel: options.expansionLevel === 'minimal' ? 'minimal' : 'moderate',
      addExamples: options.addExamples !== false,
      addDetails: options.addDetails !== false,
    });

    return new Response(
      JSON.stringify({
        text: extrapolated,
        profileId: resolved.voiceProfileId,
        success: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, code: 'INTERNAL_ERROR', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
