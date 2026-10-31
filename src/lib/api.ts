import type { Atlas, Thinker } from './atlas';
import { parseId, conceptUrl, workUrl, thinkerUrl, journalRefs, journalTitle, yearOf, journalId, journalUrl } from './atlas';
import { provenanceStats } from './provenance';
import { mdxToHtml } from './md';

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

/** 正文：同时给 Markdown 与降级渲染后的 HTML（组件按 docs/content-format.md §7 降级）。 */
export function bodyOf(entry: { body?: string } | undefined) {
  if (!entry?.body) return { markdown: null, html: null };
  return { markdown: entry.body, html: mdxToHtml(entry.body) };
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
    ...(withBody ? { body: bodyOf(c) } : {}),
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
    ...(withBody ? { body: bodyOf(w) } : {}),
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
  const relation = (x: any) => (x ? bodyOf(x) : null);
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
      id: journalId(j.id),
      title: journalTitle(j),
      date: j.data.date ?? null,
      url: journalUrl(j.id),
      ...(withBody ? { body: bodyOf(j) } : {}),
    })),
    ...(withBody ? { body: bodyOf(t) } : {}),
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
    id: journalId(j.id),
    title: journalTitle(j),
    date: j.data.date ?? null,
    tags: j.data.tags ?? [],
    atlas: journalRefs(j),
    url: journalUrl(j.id),
    visibility: j.data.visibility,
    body: bodyOf(j),
  };
}

export const stats = provenanceStats;
