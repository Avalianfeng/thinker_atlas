import type { APIRoute } from 'astro';
import { getAtlas } from '@lib/atlas';
import { toJson, journalShape } from '@lib/api';

/** GET /api/v1/journal.json — 同步自 SilverBullet atlas/ 的随笔 */
export const prerender = true;

export const GET: APIRoute = async ({ url }) => {
  const atlas = await getAtlas();
  const scope = url.searchParams.get('scope');
  const list = scope === 'public' ? atlas.journal.filter((j) => j.data.visibility === 'public') : atlas.journal;
  return toJson({ api: 'v1', count: list.length, journal: list.map(journalShape) });
};
