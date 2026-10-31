import type { Atlas, Person, Piece } from './atlas';
import { personUrl, yearOf, lifespan } from './ids';
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

/** 正文：Markdown + 降级 HTML。 */
export function bodyOf(entry: { body?: string } | undefined) {
  if (!entry?.body) return { markdown: null, html: null };
  return { markdown: entry.body, html: mdxToHtml(entry.body) };
}

function pieceSlug(piece: Piece) {
  return piece.id.split('/').pop() ?? piece.id;
}

export function pieceShape(piece: Piece, withBody = true) {
  return {
    id: piece.id,
    slug: pieceSlug(piece),
    title: piece.data.title,
    kind: piece.data.kind,
    ...(withBody ? { body: bodyOf(piece) } : {}),
  };
}

export function personShape(atlas: Atlas, p: Person, withBody = true) {
  const d = p.data;
  const pieces = atlas.piecesOf(p.id);
  return {
    id: d.id,
    kind: 'person',
    name: d.name,
    name_en: d.name_en ?? null,
    born: d.born ?? null,
    died: d.died ?? null,
    lifespan: lifespan(p),
    order: d.order,
    intro: d.intro,
    portrait: d.portrait ?? null,
    visibility: d.visibility,
    url: personUrl(d.id),
    updated: atlas.updatedOf(d.id) ?? null,
    pieces: pieces.map((x) => pieceShape(x, withBody)),
    ...(withBody ? { body: bodyOf(p) } : {}),
  };
}

/** @deprecated 兼容旧调用名 */
export const thinkerShape = personShape;

export function emptyLegacyLists() {
  return { concepts: [] as unknown[], works: [] as unknown[], relations: [] as unknown[], journal: [] as unknown[] };
}
