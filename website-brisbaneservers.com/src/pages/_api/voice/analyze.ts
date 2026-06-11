import type { APIRoute } from 'astro';
import { ToneAnalyzer } from '@voice-framework/analyzers/tone-analyzer';
import { PatternExtractor } from '@voice-framework/analyzers/pattern-extractor';
import { requireEditor } from '../../../utils/auth';
import { getVoiceFramework } from '../../../utils/voice-framework';
import { resolveResourceVoiceProfile } from '../../../lib/resource-voice-profile';
import { loadResources } from '../../../lib/resources-api';

/**
 * Voice lab: tone analysis (voice-framework dashboard /api/analyze).
 * POST /api/voice/analyze
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
    const mode = body?.mode === 'patterns' ? 'patterns' : 'tone';

    if (text.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Text must be at least 10 characters', code: 'TEXT_TOO_SHORT', success: false }),
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

    if (mode === 'patterns') {
      const extractor = new PatternExtractor();
      const patterns = extractor.extractPatterns(text);
      return new Response(
        JSON.stringify({ mode, patterns, profileId: resolved.voiceProfileId, success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const analyzer = new ToneAnalyzer(resolved.profile);
    const analysis = analyzer.analyzeText(text);
    const match = analyzer.compareToProfile(analysis);

    return new Response(
      JSON.stringify({
        mode: 'tone',
        analysis,
        match,
        profileId: resolved.voiceProfileId,
        resolution: resolved.resolution,
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
