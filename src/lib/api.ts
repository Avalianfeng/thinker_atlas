import type { Atlas, Thinker } from './atlas';
import { parseId, conceptUrl, workUrl, thinkerUrl, journalRefs, journalTitle, yearOf } from './atlas';
import { provenanceStats } from './provenance';

export const API_VERSION = 'v1';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });

export { json as toJson };

export const apiFilter = <T extends { data: { visibility?: string } }>(xs: T[], scope: string | null) =>
  scope === 'public' ? xs.filter((x) => x.data.visibility === 'public') : xs;

const visible = (x: { data: { visibility?: string } }) => x.data.visibility === 'public';

/** 正文：同时给 Markdown 与渲染后的 HTML，任何工具都能读。 */
export async function bodies(entry: { body?: string } | undefined) {
  if (!entry?.body) return { markdown: null, html: null };
  const { render } = await import('astro:content');
  try {
    const { Content } = await render(entry as never);
    // 简化：HTML 通过 Astro 的渲染拿到；无法渲染的组件会降级为空。
    return { markdown: entry.body, html: String(Content ?? '') };
  } catch {
    return { markdown: entry.body, html: null };
  }
}

function statsOfEntry(atlas: Atlas, id: string) {
  return atlas.statsOf(id);
}

export function conceptShape(atlas: Atlas, c: any, withBody = true) {
  const d = c.data;
  return {
    id: d.id,
    kind: 'concept',
    thinker: `atlas:${parseId(d.id).thinker}`,
    title: d.title,
    original: d.original ?? null,
    lang: d.lang ?? null,
    period: d.period ?? null,
    definition: d.definition,
    questions: d.questions,
    builds_on: d.builds_on,
    contrasts_with: d.contrasts_with,
    has_evolution: d.evolution.length > 0,
    evolution: d.evolution,
    interlocutors: d.interlocutors,
    works: d.works,
    terms: d.terms,
    order: d.order,
    url: conceptUrl(d.id),
    visibility: d.visibility,
    updated: atlas.updatedOf(d.id) ?? null,
    provenance: statsOfEntry(atlas, d.id),
    ...(withBody ? { body: { markdown: c.body ?? null, html: null } } : {}),
  };
}

export function workShape(atlas: Atlas, w: any, withBody = true) {
  const d = w.data;
  return {
    id: d.id,
    kind: 'work',
    thinker: `atlas:${parseId(d.id).thinker}`,
    title: d.title,
    original: d.original,
    year: d.year,
    written: d.written ?? null,
    period: d.period ?? null,
    editions: d.editions,
    reading: d.reading ?? null,
    structure: d.structure,
    theses: d.theses,
    concepts: d.concepts,
    url: workUrl(d.id),
    visibility: d.visibility,
    updated: atlas.updatedOf(d.id) ?? null,
    provenance: statsOfEntry(atlas, d.id),
    ...(withBody ? { body: { markdown: w.body ?? null, html: null } } : {}),
  };
}

export function relationShape(atlas: Atlas, r: any) {
  const d = r.data;
  return {
    id: d.id,
    from: d.from,
    to: d.to,
    from_title: atlas.entities.get(d.from)?.title ?? null,
    to_title: atlas.entities.get(d.to)?.title ?? null,
    type: d.type,
    directed: d.directed,
    since: d.since ?? null,
    until: d.until ?? null,
    summary: d.summary,
    source: d.source ?? null,
    provenance: d.provenance,
    verified: d.verified,
    visibility: d.visibility,
    updated: atlas.updatedOf(d.id) ?? null,
  };
}

export async function thinkerShape(atlas: Atlas, t: Thinker, withBody = true) {
  const d = t.data;
  const life = atlas.life.get(t.id);
  const path = atlas.paths.get(t.id);
  const after = atlas.afterlife.get(t.id);
  const relation = (x: any) => (x ? { markdown: x.body ?? null, html: null } : null);
  return {
    id: d.id,
    kind: 'thinker',
    name: { zh: d.name.zh, en: d.name.en, original: d.name.original ?? null },
    born: { date: d.born.date, place: d.born.place ?? null },
    died: d.died ? { date: d.died.date, place: d.died.place ?? null } : null,
    lifespan: `${yearOf(d.born.date)}—${d.died ? yearOf(d.died.date) : ''}`,
    fields: d.fields,
    maturity: d.maturity,
    accent: d.accent,
    added: d.added,
    intro: d.intro,
    periods: d.periods,
    url: thinkerUrl(d.id),
    visibility: d.visibility,
    updated: atlas.updatedOf(d.id) ?? null,
    provenance: statsOfEntry(atlas, d.id),
    life: life
      ? {
          title: life.data.title,
          events: life.data.events.map((e) => ({
            date: e.date,
            to: e.to ?? null,
            kind: e.kind,
            title: e.title,
            place: e.place ?? null,
            note: e.note ?? null,
            source: e.source ?? null,
            work: e.work ?? null,
          })),
          body: withBody ? relation(life) : undefined,
        }
      : null,
    concepts: atlas.conceptsOf(t.id).filter((c) => !withBody || visible(c)).map((c) => conceptShape(atlas, c, withBody)),
    works: atlas.worksOf(t.id).filter((w) => !withBody || visible(w)).map((w) => workShape(atlas, w, withBody)),
    relations: atlas
      .relationsOf(t.id)
      .filter((r) => !withBody || visible(r))
      .map((r) => relationShape(atlas, r)),
    afterlife: after ? { title: after.data.title, mentions: after.data.mentions, body: withBody ? relation(after) : undefined } : null,
    path: path
      ? { title: path.data.title, steps: path.data.steps, body: withBody ? relation(path) : undefined }
      : null,
    journal: atlas.journalFor(t.id).map((j) => ({
      id: `atlas:journal/${j.id}`,
      title: journalTitle(j),
      date: j.data.date ?? null,
      url: `/journal/${j.id}/`,
      ...(withBody ? { body: { markdown: j.body ?? null, html: null } } : {}),
    })),
    ...(withBody ? { body: { markdown: t.body ?? null, html: null } } : {}),
  };
}

export function timelineShape(atlas: Atlas, scope?: string | null) {
  return atlas.thinkers
    .filter((t) => (scope === 'public' ? visible(t) : true))
    .map((t) => ({
      thinker: t.id,
      name: t.data.name.zh,
      accent: t.data.accent,
      events: (atlas.life.get(t.id)?.data.events ?? []).map((e) => ({
        date: e.date,
        to: e.to ?? null,
        kind: e.kind,
        title: e.title,
        work: e.work ?? null,
      })),
    }));
}

export function graphShape(atlas: Atlas, scope?: string | null) {
  const ts = atlas.thinkers.filter((t) => (scope === 'public' ? visible(t) : true));
  const ids = new Set(ts.map((t) => t.id));
  return {
    nodes: ts.map((t) => ({
      id: t.id,
      label: t.data.name.zh,
      born: yearOf(t.data.born.date),
      died: t.data.died ? yearOf(t.data.died.date) : null,
      accent: t.data.accent,
      maturity: t.data.maturity,
      url: thinkerUrl(t.id),
    })),
    edges: atlas.relations
      .filter((r) => (!scope || scope !== 'public' ? true : visible(r)))
      .filter((r) => ids.has(`atlas:${parseId(r.data.from).thinker}`) && ids.has(`atlas:${parseId(r.data.to).thinker}`))
      .map((r) => ({
        id: r.data.id,
        from: `atlas:${parseId(r.data.from).thinker}`,
        to: `atlas:${parseId(r.data.to).thinker}`,
        from_entity: r.data.from,
        to_entity: r.data.to,
        type: r.data.type,
        directed: r.data.directed,
        verified: r.data.verified,
        since: r.data.since ?? null,
      })),
  };
}

export function journalShape(j: any) {
  return {
    id: `atlas:journal/${j.id}`,
    title: journalTitle(j),
    date: j.data.date ?? null,
    tags: j.data.tags ?? [],
    atlas: journalRefs(j),
    url: `/journal/${j.id}/`,
    visibility: j.data.visibility,
    body: { markdown: j.body ?? null, html: null },
  };
}

export const stats = provenanceStats;
