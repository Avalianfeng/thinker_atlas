/**
 * 唯一的读取接口：列出人物、读一个人。
 *
 * 本地文件夹是唯一的实现。页面只认这两个函数返回的形状。
 * SilverBullet 的实现留在文件末尾，是空的。
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'js-yaml';

export interface Section {
  /** 文件名，如 00-生平.md */
  file: string;
  /** 显示用的小节标题 */
  title: string;
  /** 正文（已去掉标题那一行） */
  body: string;
}

export interface Person {
  /** 文件夹名，也是显示名 */
  folder: string;
  name: string;
  born?: number;
  died?: number;
  /** 文件夹里的照片文件名 */
  photo?: string;
  /** 照片在页面上的地址 */
  photoUrl?: string;
  sections: Section[];
}

const IMAGE = /\.(jpe?g|png|webp|avif|gif|svg)$/i;
const META = '_meta.md';

/** 列出所有人，顺序取自 _meta.md；没写的排在后面，按文件夹名。 */
export async function listPeople(root: string): Promise<Person[]> {
  const { order, people } = await readMeta(root);
  const folders = await subfolders(root);
  const rank = (name: string) => {
    const i = order.indexOf(name);
    return i === -1 ? order.length + 1 : i;
  };
  const sorted = folders.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'zh-Hans-CN'));
  return Promise.all(sorted.map((folder) => hydrate(root, folder, people[folder] ?? {})));
}

/** 读一个人；文件夹不存在返回 null。 */
export async function readPerson(root: string, folder: string): Promise<Person | null> {
  const folders = await subfolders(root);
  if (!folders.includes(folder)) return null;
  const { people } = await readMeta(root);
  return hydrate(root, folder, people[folder] ?? {});
}

async function subfolders(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/** 把一个人的文件夹读成完整对象。读不了的部分一律降级成空，不抛错。 */
async function hydrate(root: string, folder: string, meta: MetaPerson): Promise<Person> {
  const dir = path.join(root, folder);
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    /* 文件夹读不了就当空的 */
  }

  const files = names
    .filter((n) => n.toLowerCase().endsWith('.md') && !n.startsWith('_'))
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true }));

  const sections: Section[] = [];
  for (const file of files) {
    let text: string;
    try {
      text = await readFile(path.join(dir, file), 'utf8');
    } catch {
      continue; // 单篇读不了就跳过
    }
    const { title, body } = splitTitle(text, file);
    if (!body.trim()) continue; // 空文件不出空标题
    sections.push({ file, title, body });
  }

  const images = names.filter((n) => IMAGE.test(n));
  const photo =
    meta.photo && images.includes(meta.photo)
      ? meta.photo
      : (images.find((n) => /portrait|photo|肖像|照片/i.test(n)) ?? images[0]);

  return {
    folder,
    name: folder,
    born: meta.born,
    died: meta.died,
    photo,
    photoUrl: photo ? `/atlas/${encodeURIComponent(folder)}/${encodeURIComponent(photo)}` : undefined,
    sections,
  };
}

/* ---------- _meta.md ---------- */

interface MetaPerson {
  born?: number;
  died?: number;
  photo?: string;
}

interface Meta {
  order: string[];
  people: Record<string, MetaPerson>;
}

/**
 * atlas/_meta.md 的 frontmatter：
 *   顺序: [维特根斯坦, 荣格]
 *   人物:
 *     维特根斯坦: { 生: 1889, 卒: 1951, 照片: 照片.jpg }
 * 读不懂就当没有。
 */
async function readMeta(root: string): Promise<Meta> {
  const empty: Meta = { order: [], people: {} };
  let text: string;
  try {
    text = await readFile(path.join(root, META), 'utf8');
  } catch {
    return empty;
  }

  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!fm) return empty;

  let data: unknown;
  try {
    data = load(fm[1]);
  } catch {
    return empty;
  }
  if (!data || typeof data !== 'object') return empty;

  const raw = data as Record<string, unknown>;
  const order = Array.isArray(raw['顺序']) ? (raw['顺序'] as unknown[]).map(String) : [];
  const people: Record<string, MetaPerson> = {};

  const rawPeople = raw['人物'];
  if (rawPeople && typeof rawPeople === 'object') {
    for (const [folder, value] of Object.entries(rawPeople as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as Record<string, unknown>;
      people[folder] = {
        born: toYear(v['生']),
        died: toYear(v['卒']),
        photo: typeof v['照片'] === 'string' ? (v['照片'] as string) : undefined,
      };
    }
  }

  return { order, people };
}

function toYear(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined;
}

/* ---------- 一篇 md 的标题与正文 ---------- */

/** 标题：开头的 # 标题 > frontmatter 的 title > 文件名。 */
export function splitTitle(raw: string, file: string): { title: string; body: string } {
  let body = (raw ?? '').replace(/^\uFEFF/, '');
  let title: string | undefined;

  const fm = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(body);
  if (fm) {
    const m = /^title:\s*(.+)$/m.exec(fm[1]);
    if (m) title = m[1].trim().replace(/^["']|["']$/g, '');
    body = body.slice(fm[0].length);
  }

  const trimmed = body.replace(/^\s+/, '');
  if (trimmed.startsWith('# ')) {
    const line = trimmed.slice(2).split('\n')[0].trim();
    title = title || line;
    body = trimmed.slice(2 + line.length);
  }

  return { title: title || titleFromFilename(file), body: body.replace(/^\s*\n/, '') };
}

/** 00-生平.md → 生平 */
export function titleFromFilename(file: string): string {
  return file
    .replace(/\.md$/i, '')
    .replace(/^\d+\s*[-_.、]\s*/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

/** 没有照片时当排版用的那个字。 */
export function initialOf(name: string): string {
  return [...(name ?? '').trim()][0] ?? '·';
}

/* ---------- 未实现 ---------- */

/**
 * TODO：以 SilverBullet 的 HTTP 文件接口为源，实现上面同样的两个函数。
 * 本轮不做：不联网、不读凭据、不做快照。
 */
export const silverbullet = {
  async listPeople(): Promise<Person[]> {
    throw new Error('SilverBullet 源尚未实现');
  },
  async readPerson(): Promise<Person | null> {
    throw new Error('SilverBullet 源尚未实现');
  },
};
