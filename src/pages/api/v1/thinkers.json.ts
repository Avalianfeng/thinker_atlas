import type { APIRoute } from 'astro';
import { getAtlas } from '@lib/atlas';
import { toJson, thinkerShape } from '@lib/api';

/** GET /api/v1/thinkers.json?scope=public — 列表 */
export const prerender = true;

export const GET: APIRoute = async ({ url }) => {
  const atlas = await getAtlas();
  const scope = url.searchParams.get('scope');
  const list = scope === 'public' ? atlas.thinkers.filter((t) => t.data.visibility === 'public') : atlas.thinkers;
  return toJson({
    api: 'v1',
    generated: atlas.thinkers.length ? new Date().toISOString() : null,
    count: list.length,
    thinkers: await Promise.all(list.map((t) => thinkerShape(atlas, t, false))),
  });
};
