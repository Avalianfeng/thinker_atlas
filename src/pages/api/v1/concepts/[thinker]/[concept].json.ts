import type { APIRoute } from 'astro';
import { getAtlas, parseId } from '@lib/atlas';
import { toJson, conceptShape } from '@lib/api';

/** GET /api/v1/concepts/{thinker}/{concept}.json */
export const prerender = true;

export async function getStaticPaths() {
  const atlas = await getAtlas();
  return atlas.concepts.map((c) => {
    const { thinker, item } = parseId(c.id);
    return { params: { thinker, concept: item }, props: { id: c.id } };
  });
}

export const GET: APIRoute = async ({ props }) => {
  const atlas = await getAtlas();
  const c = atlas.concepts.find((x) => x.id === (props as any).id)!;
  const shape = conceptShape(atlas, c, true);
  const notes = atlas.notesFor(c.id).map((n) => ({
    id: n.id,
    title: n.data.title,
    page: n.data.page,
    url: n.data.url ?? null,
    atlas: n.data.atlas,
  }));
  return toJson({ ...shape, notes_in_notes_app: notes, related_journal: atlas.journalFor(c.id).map((j) => `/journal/${j.id}/`) });
};
