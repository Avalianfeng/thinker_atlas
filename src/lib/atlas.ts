import { getCollection, type CollectionEntry } from 'astro:content';
import { lastModified } from './git';
import { parseId, personUrl, lifespan, yearOf } from './ids';

export { parseId, personUrl, thinkerUrl, conceptUrl, workUrl, yearOf, lifespan, normalizeRef } from './ids';

export type Person = CollectionEntry<'people'>;
export type Piece = CollectionEntry<'pieces'>;

/** 兼容旧名。 */
export type Thinker = Person;

export interface EntityRef {
  id: string;
  kind: 'person';
  title: string;
  url: string;
}

let cache: Promise<Atlas> | null = null;

export interface Atlas {
  people: Person[];
  /** @deprecated 用 people */
  thinkers: Person[];
  pieces: Piece[];
  entities: Map<string, EntityRef>;
  person(id: string): Person;
  /** @deprecated 用 person */
  thinker(id: string): Person;
  piecesOf(id: string): Piece[];
  updatedOf(id: string): string | undefined;
  ref(id: string): EntityRef;
}

function personKey(id: string) {
  return parseId(id).person;
}

function piecePersonId(piece: Piece): string {
  // entry id 形如 wittgenstein/01-语言游戏；filePath 备选
  const fromId = piece.id.includes('/') ? piece.id.split('/')[0]! : '';
  if (fromId) return fromId;
  const fp = piece.filePath?.replace(/\\/g, '/') ?? '';
  const m = /content\/people\/([^/]+)\//.exec(fp);
  return m?.[1] ?? '';
}

export function getAtlas(): Promise<Atlas> {
  if (!cache) cache = build();
  return cache;
}

async function build(): Promise<Atlas> {
  const [peopleRaw, piecesRaw] = await Promise.all([getCollection('people'), getCollection('pieces')]);
  const people = [...peopleRaw].sort((a, b) => a.data.order - b.data.order);
  // 双保险：排除误扫到的 index
  const pieces = piecesRaw
    .filter((p) => !p.id.endsWith('/index') && !p.id.endsWith('index'))
    .sort((a, b) => a.id.localeCompare(b.id, 'zh'));

  const entities = new Map<string, EntityRef>();
  const errors: string[] = [];

  for (const p of people) {
    if (entities.has(p.id)) errors.push(`重复人物 id ${p.id}（${p.filePath}）`);
    if (personKey(p.id) !== p.id) errors.push(`${p.filePath}: id 应为夹名本身（无 atlas: 前缀）`);
    entities.set(p.id, { id: p.id, kind: 'person', title: p.data.name, url: personUrl(p.id) });
  }

  for (const piece of pieces) {
    const pid = piecePersonId(piece);
    if (!entities.has(pid)) errors.push(`${piece.filePath}: 所属人物 ${pid} 不存在`);
  }

  // 夹名与 id 一致
  for (const p of people) {
    const fp = p.filePath?.replace(/\\/g, '/') ?? '';
    const m = /content\/people\/([^/]+)\//.exec(fp);
    if (m && m[1] !== p.id) errors.push(`${p.filePath}: 夹名 ${m[1]} 与 id ${p.id} 不一致`);
  }

  if (errors.length) throw new Error(`内容校验失败：\n  - ${errors.join('\n  - ')}`);

  const atlas: Atlas = {
    people,
    thinkers: people,
    pieces,
    entities,
    person: (id) => {
      const key = personKey(id);
      const t = people.find((x) => x.id === key);
      if (!t) throw new Error(`未知人物 ${id}`);
      return t;
    },
    thinker: (id) => atlas.person(id),
    piecesOf: (id) => {
      const key = personKey(id);
      return pieces.filter((p) => piecePersonId(p) === key);
    },
    ref: (id) => {
      const r = entities.get(personKey(id));
      if (!r) throw new Error(`未知条目 ${id}`);
      return r;
    },
    updatedOf: (id) => {
      const key = personKey(id);
      const person = people.find((p) => p.id === key);
      const files = [person?.filePath, ...pieces.filter((p) => piecePersonId(p) === key).map((p) => p.filePath)];
      return files.map(lastModified).filter(Boolean).sort().pop();
    },
  };
  return atlas;
}

/** 把文件路径映射回条目，用于「最近修改」。 */
export function entityForFile(atlas: Atlas, file: string): EntityRef | undefined {
  const norm = file.replace(/\\/g, '/');
  const person = atlas.people.find((p) => p.filePath === file || p.filePath?.endsWith(norm));
  if (person) return atlas.entities.get(person.id);
  const piece = atlas.pieces.find((p) => p.filePath === file || p.filePath?.endsWith(norm));
  if (piece) {
    const pid = piecePersonId(piece);
    const ent = atlas.entities.get(pid);
    if (!ent) return undefined;
    return { id: piece.id, kind: 'person', title: `${ent.title} · ${piece.data.title}`, url: `${ent.url}#${piece.id.split('/').pop()}` };
  }
  // 宽松：路径含 content/people/<id>
  const m = /content\/people\/([^/]+)/.exec(norm);
  if (m && atlas.entities.has(m[1]!)) return atlas.entities.get(m[1]!);
  return undefined;
}
