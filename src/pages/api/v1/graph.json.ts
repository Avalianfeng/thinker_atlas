import type { APIRoute } from 'astro';
import { getAtlas } from '@lib/atlas';
import { toJson, graphShape } from '@lib/api';

/** GET /api/v1/graph.json — 谱系图（节点 + 边），供其他站点直接画图 */
export const prerender = true;

export const GET: APIRoute = async ({ url }) => {
  const atlas = await getAtlas();
  const scope = url.searchParams.get('scope');
  return toJson({ api: 'v1', ...graphShape(atlas, scope) });
};
