import { parseFrontmatter as parseSimple } from './notes.mjs';
import { load } from 'js-yaml';

/** 解析 frontmatter：优先 js-yaml（支持嵌套），失败时退回极简解析。 */
export function parse(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { data: {}, body: text };
  let data;
  try {
    data = load(m[1]) ?? {};
  } catch {
    data = parseSimple(text);
  }
  return { data, body: text.slice(m[0].length) };
}
