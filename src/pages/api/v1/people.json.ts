import type { APIRoute } from 'astro';
import { getAtlas } from '@lib/atlas';
import { toJson, personShape, apiFilter } from '@lib/api';

export const prerender = true;

export const GET: APIRoute = async ({ url }) => {
  const atlas = await getAtlas();
  const scope = url.searchParams.get('scope');
  const list = apiFilter(atlas.people, scope);
  return toJson({
    api: 'v1',
    generated: new Date().toISOString(),
    count: list.length,
    people: list.map((p) => personShape(atlas, p, false)),
  });
};
