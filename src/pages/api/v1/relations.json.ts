import type { APIRoute } from 'astro';
import { getAtlas } from '@lib/atlas';
import { toJson, relationShape } from '@lib/api';

/** GET /api/v1/relations.json?type=影响&thinker=wittgenstein */
export const prerender = true;

export const GET: APIRoute = async ({ url }) => {
  const atlas = await getAtlas();
  const type = url.searchParams.get('type');
  const thinker = url.searchParams.get('thinker');
  const scope = url.searchParams.get('scope');
  let list = atlas.relations;
  if (type) list = list.filter((r) => r.data.type === type);
  if (thinker) list = list.filter((r) => [r.data.from, r.data.to].some((x) => x.startsWith(`atlas:${thinker}`)));
  if (scope === 'public') list = list.filter((r) => r.data.visibility === 'public');
  return toJson({ api: 'v1', count: list.length, relations: list.map((r) => relationShape(atlas, r)) });
};
