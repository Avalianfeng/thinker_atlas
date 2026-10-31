import type { APIRoute } from 'astro';
import { getAtlas, parseId } from '@lib/atlas';
import { toJson, thinkerShape } from '@lib/api';

/** GET /api/v1/thinkers/{id}.json — 单人完整档案（生平事件、概念、作品、关系、正文） */
export const prerender = true;

export async function getStaticPaths() {
  const atlas = await getAtlas();
  return atlas.thinkers.map((t) => ({ params: { id: parseId(t.id).thinker }, props: { thinkerId: t.id } }));
}

export const GET: APIRoute = async ({ props }) => {
  const atlas = await getAtlas();
  const t = atlas.thinker((props as any).thinkerId);
  return toJson(await thinkerShape(atlas, t, true));
};
