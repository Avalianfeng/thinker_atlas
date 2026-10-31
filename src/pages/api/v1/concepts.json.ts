import type { APIRoute } from 'astro';
import { getAtlas } from '@lib/atlas';
import { toJson, conceptShape } from '@lib/api';

/** GET /api/v1/concepts.json — 全部概念 */
export const prerender = true;

export const GET: APIRoute = async ({ url }) => {
  const atlas = await getAtlas();
  const scope = url.searchParams.get('scope');
  const list = scope === 'public' ? atlas.concepts.filter((c) => c.data.visibility === 'public') : atlas.concepts;
  return toJson({ api: 'v1', count: list.length, concepts: list.map((c) => conceptShape(atlas, c, false)) });
};
