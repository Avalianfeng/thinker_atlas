import type { APIRoute } from 'astro';
import { getAtlas } from '@lib/atlas';
import { toJson, personShape } from '@lib/api';

export const prerender = true;

const pick = <T extends { data: { visibility?: string } }>(xs: T[]) => xs.filter((x) => x.data.visibility === 'public');

export async function getStaticPaths() {
  const atlas = await getAtlas();
  const routes: { params: { path?: string } }[] = [
    { params: { path: 'index' } },
    { params: { path: 'people' } },
  ];
  for (const p of pick(atlas.people)) routes.push({ params: { path: `people/${p.id}` } });
  return routes;
}

export const GET: APIRoute = async ({ params }) => {
  const atlas = await getAtlas();
  const path = params.path || 'index';
  const publicPeople = pick(atlas.people);

  if (path === 'index') {
    return toJson({
      api: 'public',
      counts: { people: publicPeople.length },
      endpoints: ['/api/public/people.json', '/api/public/people/{id}.json'],
    });
  }
  if (path === 'people') {
    return toJson({
      api: 'public',
      count: publicPeople.length,
      people: publicPeople.map((p) => personShape(atlas, p, false)),
    });
  }
  if (path.startsWith('people/')) {
    const id = path.slice('people/'.length);
    const person = publicPeople.find((p) => p.id === id);
    if (!person) return toJson({ error: 'not found' }, 404);
    return toJson(personShape(atlas, person, true));
  }
  return toJson({ error: 'not found' }, 404);
};
