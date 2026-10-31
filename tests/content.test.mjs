import { describe, it, expect } from 'vitest';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../scripts/lib/frontmatter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const peopleRoot = path.join(root, 'content', 'people');
const KINDS = new Set(['life', 'work', 'note', 'other']);
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

async function listPeople() {
  const ents = await readdir(peopleRoot, { withFileTypes: true }).catch(() => []);
  return ents.filter((e) => e.isDirectory()).map((e) => e.name);
}

describe('content v2 自检', () => {
  it('每人有 index.md，id 与夹名一致，最小字段齐全', async () => {
    const dirs = await listPeople();
    expect(dirs.length).toBeGreaterThan(0);
    for (const dir of dirs) {
      expect(dir).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      const indexPath = path.join(peopleRoot, dir, 'index.md');
      const raw = await readFile(indexPath, 'utf8');
      const { data } = parse(raw);
      expect(data.id, `${dir}/index.md 缺 id`).toBe(dir);
      expect(data.name).toBeTruthy();
      expect(typeof data.order).toBe('number');
      expect(data.intro).toBeTruthy();
      if (data.visibility !== undefined) expect(['private', 'public']).toContain(data.visibility);
    }
  });

  it('篇章 frontmatter 有 title 与合法 kind；按文件名排序可枚举', async () => {
    for (const dir of await listPeople()) {
      const files = (await readdir(path.join(peopleRoot, dir)))
        .filter((f) => f.endsWith('.md') && f !== 'index.md')
        .sort((a, b) => a.localeCompare(b, 'zh'));
      for (const f of files) {
        const { data } = parse(await readFile(path.join(peopleRoot, dir, f), 'utf8'));
        expect(data.title, `${dir}/${f}`).toBeTruthy();
        expect(KINDS.has(data.kind), `${dir}/${f} kind=${data.kind}`).toBe(true);
      }
    }
  });

  it('无 v1 子树（thought/works/relations/journal/sb-cache）在 content/', async () => {
    const content = path.join(root, 'content');
    const top = await readdir(content);
    expect(top).toContain('people');
    for (const banned of ['thinkers', 'relations', 'journal', 'sb-cache']) {
      expect(top).not.toContain(banned);
    }
  });

  it('相对路径图片文件存在于人物夹内', async () => {
    for (const dir of await listPeople()) {
      const dirPath = path.join(peopleRoot, dir);
      const mdFiles = (await readdir(dirPath)).filter((f) => f.endsWith('.md'));
      for (const f of mdFiles) {
        const raw = await readFile(path.join(dirPath, f), 'utf8');
        for (const m of raw.matchAll(/!\[[^\]]*\]\((\.\/[^)]+)\)/g)) {
          const rel = m[1].replace(/^\.\//, '');
          const st = await stat(path.join(dirPath, rel));
          expect(st.isFile(), `${dir}/${f} 引用缺失 ${rel}`).toBe(true);
          expect(EXTS.has(path.extname(rel).toLowerCase())).toBe(true);
        }
      }
    }
  });

  it('样例维特根斯坦含肖像与至少一篇正文', async () => {
    const dir = path.join(peopleRoot, 'wittgenstein');
    const files = await readdir(dir);
    expect(files).toContain('index.md');
    expect(files.some((f) => /^portrait\./i.test(f))).toBe(true);
    expect(files.some((f) => f.endsWith('.md') && f !== 'index.md')).toBe(true);
  });

  it('有 timeline.yml 的人物文件可被枚举（样例维氏）', async () => {
    const files = await readdir(path.join(peopleRoot, 'wittgenstein'));
    expect(files).toContain('timeline.yml');
  });
});
