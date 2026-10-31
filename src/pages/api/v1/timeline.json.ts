import type { APIRoute } from 'astro';
import { getAtlas } from '@lib/atlas';
import { toJson, timelineShape } from '@lib/api';

/** GET /api/v1/timeline.json — 多人时间线（泳道） */
export const prerender = true;

export const GET: APIRoute = async ({ url }) => {
  const atlas = await getAtlas();
  const scope = url.searchParams.get('scope');
  return toJson({ api: 'v1', lanes: timelineShape(atlas, scope) });
};
