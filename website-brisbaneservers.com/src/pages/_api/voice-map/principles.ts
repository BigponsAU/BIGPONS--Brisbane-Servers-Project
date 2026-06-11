import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { getVoiceFramework } from '../../../utils/voice-framework';

/**
 * Principles topology for voice map (voice-framework /api/topology/principles).
 * GET /api/voice-map/principles?profileId=
 */
export const GET: APIRoute = async ({ request, url }) => {
  const authResult = await requireEditor(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: authResult.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const profileId = url.searchParams.get('profileId')?.trim() || '';
    const { textStorage, profileManager } = await getVoiceFramework();
    await textStorage.initialize();

    let principles = textStorage.getPrinciples();
    let relationships = textStorage.getAllRelationships();

    if (profileId) {
      const profile = profileManager.getProfile(profileId);
      if (profile) {
        principles = principles.filter((p) => {
          const metadata = p.metadata || {};
          return metadata.profileId === profileId || !metadata.profileId;
        });
      }
    }

    const nodes = principles.map((principle, index) => {
      const total = Math.max(principles.length, 1);
      const angle = (index / total) * Math.PI * 2;
      const radius = 5 + (principle.metadata?.confidence ?? 0.5) * 3;
      return {
        id: principle.id,
        label: principle.principle,
        description: principle.description,
        category: principle.category,
        x: Math.cos(angle) * radius,
        y: (principle.metadata?.confidence ?? 0.5) * 5 - 2.5,
        z: Math.sin(angle) * radius,
      };
    });

    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const edges = relationships
      .map((rel) => {
        const source = nodeById.get(rel.sourceId);
        const target = nodeById.get(rel.targetId);
        if (!source || !target) return null;
        return {
          id: rel.id,
          sourceId: rel.sourceId,
          targetId: rel.targetId,
          type: rel.relationshipType,
          strength: rel.strength,
        };
      })
      .filter(Boolean);

    return new Response(
      JSON.stringify({
        nodes,
        edges,
        total: nodes.length,
        source: 'principles',
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
