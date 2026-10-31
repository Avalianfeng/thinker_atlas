import { getCollection, type CollectionEntry } from 'astro:content';
import { provenanceStats, addStats, emptyStats, type ProvenanceStats } from './provenance';
import { lastModified } from './git';
import { parseId, normalizeRef, thinkerUrl, conceptUrl, workUrl, yearOf, lifespan } from './ids';

export { parseId, normalizeRef, thinkerUrl, conceptUrl, workUrl, yearOf, lifespan };

export type Thinker = CollectionEntry<'thinkers'>;
export type Concept = CollectionEntry<'concepts'>;
export type Work = CollectionEntry<'works'>;
export type Relation = CollectionEntry<'relations'>;
export type Life = CollectionEntry<'life'>;
export type Afterlife = CollectionEntry<'afterlife'>;
export type PathEntry = CollectionEntry<'paths'>;
export type Journal = CollectionEntry<'journal'>;
export type SBNoteEntry = CollectionEntry<'sbnotes'>;

export type EntityKind = 'thinker' | 'concept' | 'work' | 'journal';

export interface EntityRef {
  id: string;
  kind: EntityKind;
  title: string;
  url: string;
  thinker?: string;
}

const asArray = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

let cache: Promise<Atlas> | null = null;

export interface Atlas {
  thinkers: Thinker[];
  concepts: Concept[];
  works: Work[];
  relations: Relation[];
  life: Map<string, Life>;
  afterlife: Map<string, Afterlife>;
  paths: Map<string, PathEntry>;
  journal: Journal[];
  sbnotes: SBNoteEntry[];
  entities: Map<string, EntityRef>;
  /** 随笔的稳定 ID → 页面地址，供接口与页面共用 */
  journalUrl: (id: string) => string;
  thinker(id: string): Thinker;
  conceptsOf(id: string): Concept[];
  worksOf(id: string): Work[];
  relationsOf(id: string): Relation[];
  journalFor(id: string): Journal[];
  notesFor(id: string): SBNoteEntry[];
  statsOf(id: string): ProvenanceStats;
  updatedOf(id: string): string | undefined;
  ref(id: string): EntityRef;
}

/** 随笔的稳定 ID 与页面地址。文件名（含中文）只用于 URL，ID 用 ASCII slug。 */
export const journalId = (id: string) => {
  const ascii = id
    .replace(/\.md$/, '')
    .split('/')
    .map((seg) =>
      /^[a-z0-9-]+$/i.test(seg)
        ? seg.toLowerCase()
        : [...seg].map((ch) => (/[a-z0-9-]/i.test(ch) ? ch.toLowerCase() : `u${ch.codePointAt(0)!.toString(16)}`)).join(''),
    )
    .join('/');
  return `atlas:journal/${ascii}`;
};
export const journalUrl = (id: string) => `/journal/${id}/`;

export const journalRefs = (j: Journal) => asArray(j.data.atlas as string | string[] | undefined).map(normalizeRef);
export const journalTitle = (j: Journal) => (j.data.title as string | undefined) || j.id.split('/').pop()!;

export function getAtlas(): Promise<Atlas> {
  if (!cache) cache = build();
  return cache;
}

async function build(): Promise<Atlas> {
  const [thinkers, concepts, works, relations, life, afterlife, paths, journal, sbnotes] = await Promise.all([
    getCollection('thinkers'),
    getCollection('concepts'),
    getCollection('works'),
    getCollection('relations'),
    getCollection('life'),
    getCollection('afterlife'),
    getCollection('paths'),
    getCollection('journal'),
    getCollection('sbnotes'),
  ]);
  thinkers.sort((a, b) => a.data.order - b.data.order);
  concepts.sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title, 'zh'));
  works.sort((a, b) => a.data.year - b.data.year);

  const entities = new Map<string, EntityRef>();
  const errors: string[] = [];
  const add = (r: EntityRef, file?: string) => {
    if (entities.has(r.id)) errors.push(`重复 ID ${r.id}（${file}）`);
    entities.set(r.id, r);
  };
  for (const t of thinkers) add({ id: t.id, kind: 'thinker', title: t.data.name.zh, url: thinkerUrl(t.id) }, t.filePath);
  for (const c of concepts) {
    const th = `atlas:${parseId(c.id).thinker}`;
    add({ id: c.id, kind: 'concept', title: c.data.title, url: conceptUrl(c.id), thinker: th }, c.filePath);
  }
  for (const w of works) {
    const th = `atlas:${parseId(w.id).thinker}`;
    add({ id: w.id, kind: 'work', title: w.data.title, url: workUrl(w.id), thinker: th }, w.filePath);
  }

  const check = (ref: string, where: string) => {
    if (!entities.has(ref)) errors.push(`${where} 引用了不存在的条目 ${ref}`);
  };
  for (const c of concepts) {
    if (!entities.has(`atlas:${parseId(c.id).thinker}`)) errors.push(`${c.filePath}: 所属人物不存在`);
    [...c.data.builds_on, ...c.data.contrasts_with, ...c.data.works].forEach((r) => check(r, c.filePath!));
    c.data.interlocutors.forEach((i) => check(i.concept, c.filePath!));
    const t = thinkers.find((x) => x.id === `atlas:${parseId(c.id).thinker}`);
    if (c.data.period && t && !t.data.periods.some((p) => p.id === c.data.period))
      errors.push(`${c.filePath}: 时期 ${c.data.period} 未在人物档案 periods 中定义`);
  }
  for (const w of works) w.data.concepts.forEach((r) => check(r, w.filePath!));
  for (const r of relations) [r.data.from, r.data.to].forEach((x) => check(x, r.filePath!));
  for (const l of life) {
    check(l.data.thinker, l.filePath!);
    l.data.events.forEach((e) => e.work && check(e.work, l.filePath!));
  }
  for (const a of afterlife) [a.data.thinker, ...a.data.mentions].forEach((x) => check(x, a.filePath!));
  for (const p of paths) {
    check(p.data.thinker, p.filePath!);
    p.data.steps.forEach((s) => s.refs.forEach((x) => check(x, p.filePath!)));
  }
  for (const j of journal) {
    add({ id: journalId(j.id), kind: 'journal', title: journalTitle(j), url: journalUrl(j.id) });
    for (const r of journalRefs(j)) if (!entities.has(r)) console.warn(`[atlas] 随笔 ${j.filePath} 的 atlas: ${r} 未找到对应条目`);
  }
  for (const n of sbnotes)
    for (const r of n.data.atlas) if (!entities.has(r)) console.warn(`[atlas] SilverBullet 笔记 ${n.data.page} 的 atlas: ${r} 未找到对应条目`);
  if (errors.length) throw new Error(`内容校验失败：\n  - ${errors.join('\n  - ')}`);

  const lifeMap: Map<string, Life> = new Map(life.map((x) => [x.data.thinker, x]));
  const afterMap: Map<string, Afterlife> = new Map(afterlife.map((x) => [x.data.thinker, x]));
  const pathMap: Map<string, PathEntry> = new Map(paths.map((x) => [x.data.thinker, x]));

  const ownerOf = (id: string) => `atlas:${parseId(id).thinker}`;
  const touches = (target: string, id: string) => target === id || target.startsWith(id + '/');

  const statsCache = new Map<string, ProvenanceStats>();
  const atlas: Atlas = {
    thinkers,
    concepts,
    works,
    relations,
    life: lifeMap,
    afterlife: afterMap,
    paths: pathMap,
    journal,
    sbnotes,
    entities,
    journalUrl,
    thinker: (id) => {
      const t = thinkers.find((x) => x.id === id);
      if (!t) throw new Error(`未知人物 ${id}`);
      return t;
    },
    conceptsOf: (id) => concepts.filter((c) => ownerOf(c.id) === id),
    worksOf: (id) => works.filter((w) => ownerOf(w.id) === id),
    relationsOf: (id) => relations.filter((r) => touches(r.data.from, id) || touches(r.data.to, id)),
    journalFor: (id) => journal.filter((j) => journalRefs(j).some((r) => touches(r, id))),
    notesFor: (id) => sbnotes.filter((n) => n.data.atlas.some((r) => touches(r, id))),
    ref: (id) => {
      const r = entities.get(id);
      if (!r) throw new Error(`未知条目 ${id}`);
      return r;
    },
    statsOf: (id) => {
      if (statsCache.has(id)) return statsCache.get(id)!;
      let s = emptyStats();
      const kind = entities.get(id)?.kind;
      if (kind === 'thinker') {
        const bodies = [
          thinkers.find((t) => t.id === id)?.body,
          lifeMap.get(id)?.body,
          afterMap.get(id)?.body,
          pathMap.get(id)?.body,
          ...atlas.conceptsOf(id).map((c) => c.body),
          ...atlas.worksOf(id).map((w) => w.body),
        ];
        for (const b of bodies) s = addStats(s, provenanceStats(b));
        for (const j of atlas.journalFor(id)) s = addStats(s, provenanceStats(j.body));
      } else {
        const e = [...concepts, ...works].find((x) => x.id === id);
        s = provenanceStats(e?.body);
      }
      statsCache.set(id, s);
      return s;
    },
    updatedOf: (id) => {
      const kind = entities.get(id)?.kind;
      if (kind === 'thinker') {
        const files = [
          thinkers.find((t) => t.id === id)?.filePath,
          lifeMap.get(id)?.filePath,
          afterMap.get(id)?.filePath,
          pathMap.get(id)?.filePath,
          ...atlas.conceptsOf(id).map((c) => c.filePath),
          ...atlas.worksOf(id).map((w) => w.filePath),
        ];
        return files.map(lastModified).filter(Boolean).sort().pop();
      }
      const e = [...concepts, ...works, ...relations].find((x) => x.id === id);
      return lastModified(e?.filePath);
    },
  };
  return atlas;
}

/** 把文件路径映射回条目，用于"最近修改"。 */
export function entityForFile(atlas: Atlas, file: string): EntityRef | undefined {
  const all: { id: string; filePath?: string }[] = [...atlas.thinkers, ...atlas.concepts, ...atlas.works];
  const hit = all.find((e) => e.filePath === file);
  if (hit) return atlas.entities.get(hit.id);
  for (const [map, label, suffix] of [
    [atlas.life, '生平', 'life/'],
    [atlas.afterlife, '身后', 'afterlife/'],
    [atlas.paths, '学习路径', 'path/'],
  ] as const) {
    for (const [tid, e] of map as Map<string, { filePath?: string }>) {
      if (e.filePath === file) {
        const t = atlas.entities.get(tid)!;
        return { id: tid, kind: 'thinker', title: `${t.title} · ${label}`, url: `${t.url}${suffix}` };
      }
    }
  }
  const rel = atlas.relations.find((r) => r.filePath === file);
  if (rel) {
    const a = atlas.entities.get(rel.data.from)?.title ?? rel.data.from;
    const b = atlas.entities.get(rel.data.to)?.title ?? rel.data.to;
    return {
      id: rel.id,
      kind: 'concept',
      title: `关系 · ${a} ${rel.data.directed ? '→' : '↔'} ${rel.data.type} ${b}`,
      url: `/genealogy/?thinker=${rel.data.from.split('/')[0].replace('atlas:', '')}`,
    };
  }
  const j = atlas.journal.find((x) => x.filePath === file);
  if (j) return { id: j.id, kind: 'journal', title: `随笔 · ${journalTitle(j)}`, url: `/journal/${j.id}/` };
  return undefined;
}
