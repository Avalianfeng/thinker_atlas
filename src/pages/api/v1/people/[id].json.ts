import type { APIRoute } from 'astro';
import { getAtlas } from '@lib/atlas';
import { toJson, personShape } from '@lib/api';

export const prerender = true;

export async function getStaticPaths() {
  const atlas = await getAtlas();
  return atlas.people.map((p) => ({ params: { id: p.id } }));
}

export const GET: APIRoute = async ({ params }) => {
  const atlas = await getAtlas();
  const person = atlas.person(params.id!);
  return toJson(personShape(atlas, person, true));
};
