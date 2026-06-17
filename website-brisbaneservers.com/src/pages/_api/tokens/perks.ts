import type { APIRoute } from 'astro';
import { TOKEN_PERKS } from '../../../data/token-perks';

/**
 * List flat token perks (no auth required).
 * GET /api/tokens/perks
 */
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      success: true,
      perks: TOKEN_PERKS.map((p) => ({
        id: p.id,
        label: p.label,
        description: p.description,
        cost: p.cost,
        effect: p.effect,
        oncePerDay: Boolean(p.oncePerDay),
      })),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
