import type { APIRoute } from 'astro';
import { getAtlas, parseId } from '@lib/atlas';
import { toJson, conceptShape, relationShape, timelineShape, graphShape, journalShape, workShape } from '@lib/api';
import { provenanceStats } from '@lib/provenance';

/**
 * 公开子集：/api/public/*。只输出 visibility: public 的条目，
 * 结构与 /api/v1 一致，方便其他站点在不给 token 的情况下取用（同样在 noindex 之后）。
 */
export const prerender = true;

const pick = <T extends { data: { visibility?: string } }>(xs: T[]) => xs.filter((x) => x.data.visibility === 'public');

export async function getStaticPaths() {
  const atlas = await getAtlas();
  const routes: { params: { path?: string } }[] = [
    { params: { path: 'index' } },
    { params: { path: 'thinkers' } },
    { params: { path: 'concepts' } },
    { params: { path: 'relations' } },
    { params: { path: 'timeline' } },
    { params: { path: 'graph' } },
    { params: { path: 'journal' } },
  ];
  for (const t of pick(atlas.thinkers)) routes.push({ params: { path: `thinkers/${parseId(t.id).thinker}` } });
  return routes;
}

export const GET: APIRoute = async ({ params }) => {
  const atlas = await getAtlas();
  const path = String(params.path);
  const thinkers = pick(atlas.thinkers);
  const concepts = pick(atlas.concepts);
  const works = pick(atlas.works);
  const relations = pick(atlas.relations);
  const journal = pick(atlas.journal);

  if (path === 'index') {
    return toJson({
      api: 'public',
      note: '仅含 visibility: public 的内容。结构同 /api/v1。',
      counts: { thinkers: thinkers.length, concepts: concepts.length, works: works.length, relations: relations.length, journal: journal.length },
      endpoints: ['/api/public/thinkers.json', '/api/public/thinkers/{id}.json', '/api/public/concepts.json', '/api/public/relations.json', '/api/public/timeline.json', '/api/public/graph.json', '/api/public/journal.json'],
    });
  }
  if (path === 'thinkers') {
    return toJson({
      api: 'public',
      count: thinkers.length,
      thinkers: thinkers.map((t) => ({
        id: t.data.id,
        name: t.data.name,
        born: t.data.born,
        died: t.data.died ?? null,
        maturity: t.data.maturity,
        intro: t.data.intro,
        url: `/thinkers/${parseId(t.data.id).thinker}/`,
        provenance: provenanceStats(t.body),
        concepts: atlas.conceptsOf(t.id).filter((c) => c.data.visibility === 'public').map((c) => ({ id: c.data.id, title: c.data.title })),
      })),
    });
  }
  if (path === 'concepts') return toJson({ api: 'public', count: concepts.length, concepts: concepts.map((c) => conceptShape(atlas, c, false)) });
  if (path === 'relations') return toJson({ api: 'public', count: relations.length, relations: relations.map((r) => relationShape(atlas, r)) });
  if (path === 'timeline') return toJson({ api: 'public', lanes: timelineShape(atlas, 'public') });
  if (path === 'graph') return toJson({ api: 'public', ...graphShape(atlas, 'public') });
  if (path === 'journal') return toJson({ api: 'public', count: journal.length, journal: journal.map(journalShape) });

  const thinker = thinkers.find((t) => `thinkers/${parseId(t.id).thinker}` === path);
  if (thinker) {
    const { thinkerShape } = await import('../../../lib/api');
    const shape = await thinkerShape(atlas, thinker, true);
    return toJson({
      ...shape,
      concepts: shape.concepts.filter((c: any) => c.visibility === 'public'),
      works: shape.works.filter((w: any) => w.visibility === 'public'),
    });
  }
  return toJson({ error: 'not_found', path }, 404);
};
