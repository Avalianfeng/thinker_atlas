/**
 * 笔记来源适配器接口。同步脚本只依赖这个接口，
 * 以后要接别的笔记工具（Obsidian、Logseq、WebDAV……）只需再加一个实现。
 *
 * 适配器只负责「列、读、写」三件事，不关心冲突判定与 ID 解析。
 */

/**
 * @typedef {object} NoteFile
 * @property {string} page    相对根目录的路径（不含前导 /，含 .md）
 * @property {string} content 文件全文
 * @property {number} [lastModified] 毫秒时间戳
 */

/**
 * @typedef {object} SourceAdapter
 * @property {string} name
 * @property {(dir: string) => Promise<NoteFile[]>} list   列出 dir 下的 .md（递归）
 * @property {(page: string) => Promise<NoteFile | null>} read
 * @property {(page: string, content: string) => Promise<void>} write
 * @property {() => Promise<boolean>} ping  可选：连通性检查
 */

export const JOURNAL_DIR = 'atlas';
export const INDEX_DIR = 'atlas/_index';
export const CACHE_DIR = 'content/sb-cache';

/** 笔记是否与 Atlas 有关：frontmatter 有 atlas:，或带 #atlas/<人物> 标签。 */
export function atlasRefsOf(note) {
  const fm = parseFrontmatter(note.content);
  const refs = [];
  if (fm.atlas) {
    const raw = Array.isArray(fm.atlas) ? fm.atlas : String(fm.atlas).split(/[,，\s]+/);
    for (const r of raw) {
      const v = String(r).trim();
      if (!v) continue;
      refs.push(v.startsWith('atlas:') ? v : `atlas:${v.replace(/^#?atlas\//, '')}`);
    }
  }
  const tagRe = /(?:^|\s)#atlas\/([a-z0-9-]+)/g;
  let m;
  while ((m = tagRe.exec(note.content + ' ' + [].concat(fm.tags ?? []).join(' ')))) {
    const id = `atlas:${m[1]}`;
    if (!refs.includes(id)) refs.push(id);
  }
  return [...new Set(refs)];
}

/** 极简 frontmatter 解析：只支持 key: value 与 [a, b]、- item 列表，够用且不引依赖。 */
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return {};
  const out = {};
  const lines = m[1].split(/\r?\n/);
  let key = null;
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const listItem = /^\s*-\s+(.*)$/.exec(line);
    if (listItem && key) {
      if (!Array.isArray(out[key])) out[key] = out[key] ? [out[key]] : [];
      out[key].push(unquote(listItem[1]));
      continue;
    }
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv) {
      key = kv[1];
      const v = kv[2].trim();
      if (v === '') out[key] = [];
      else if (v.startsWith('[') && v.endsWith(']'))
        out[key] = v
          .slice(1, -1)
          .split(',')
          .map((s) => unquote(s.trim()))
          .filter(Boolean);
      else out[key] = unquote(v);
    }
  }
  for (const [k, v] of Object.entries(out)) if (Array.isArray(v) && v.length === 0) delete out[k];
  return out;
}

const unquote = (s) => String(s).replace(/^["']|["']$/g, '').trim();

export function titleOf(note) {
  const fm = parseFrontmatter(note.content);
  if (fm.title) return String(fm.title);
  const h1 = /^#\s+(.+)$/m.exec(note.content);
  if (h1) return h1[1].trim();
  const base = note.page.split('/').pop().replace(/\.md$/, '');
  return base;
}

/** 去掉 frontmatter，只留正文（用于嵌入页面）。 */
export function bodyOf(content) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}
