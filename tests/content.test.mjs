import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../scripts/lib/frontmatter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const content = path.join(root, 'content');

async function walk(dir, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, acc);
    else if (/\.mdx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const files = await walk(content);
const entries = await Promise.all(
  files.map(async (f) => ({ file: path.relative(root, f), ...parse(await readFile(f, 'utf8')) })),
);
const ids = new Set(
  entries.filter((e) => e.data.id).map((e) => e.data.id),
);
const thinkerIds = new Set(entries.filter((e) => e.file.endsWith('index.mdx')).map((e) => e.data.id));

describe('内容仓库自检', () => {
  it('所有实体 ID 唯一且格式正确', () => {
    const seen = new Set();
    for (const e of entries) {
      if (!e.data.id) continue;
      expect(seen.has(e.data.id), `重复 ID ${e.data.id}（${e.file}）`).toBe(false);
      seen.add(e.data.id);
      expect(e.data.id).toMatch(/^atlas:[a-z0-9-]+(\/[a-z0-9-]+)?$/);
    }
  });

  it('ID 与文件位置一致：atlas:<dir>/<file>', () => {
    for (const e of entries) {
      if (!e.data.id || e.file.startsWith('content/relations/')) continue;
      const parts = e.file.split('/');
      const slug = parts[2];
      expect(e.data.id.startsWith(`atlas:${slug}`), `${e.file} 的 ID 应以 atlas:${slug} 开头`).toBe(true);
      if (parts[3] === 'thought' || parts[3] === 'works') {
        const item = parts[4].replace(/\.mdx?$/, '');
        expect(e.data.id).toBe(`atlas:${slug}/${item}`);
      }
    }
  });

  it('引用的条目都存在', () => {
    const refFields = ['thinker', 'works', 'concepts', 'builds_on', 'contrasts_with', 'mentions'];
    for (const e of entries) {
      for (const f of refFields) {
        const v = e.data[f];
        if (!v) continue;
        for (const r of Array.isArray(v) ? v : [v]) expect(ids.has(r), `${e.file} 引用了不存在的 ${r}`).toBe(true);
      }
      for (const i of e.data.interlocutors ?? []) expect(ids.has(i.concept), `${e.file} 的对话者 ${i.concept} 不存在`).toBe(true);
      for (const s of e.data.steps ?? []) for (const r of s.refs ?? []) expect(ids.has(r), `${e.file} 的路径引用了 ${r}`).toBe(true);
    }
  });

  it('每篇概念都有定义与时期，且时期在人物档案里声明过', () => {
    const periods = new Map(
      entries.filter((e) => e.file.endsWith('index.mdx')).map((e) => [e.data.id, new Set((e.data.periods ?? []).map((p) => p.id))]),
    );
    for (const e of entries.filter((x) => x.file.includes('/thought/'))) {
      expect(e.data.definition, `${e.file} 缺 definition`).toBeTruthy();
      const owner = `atlas:${e.file.split('/')[2]}`;
      if (e.data.period) expect(periods.get(owner)?.has(e.data.period), `${e.file} 的 period ${e.data.period} 未在 ${owner} 中定义`).toBe(true);
    }
  });

  it('转写与二手引用必须带出处', () => {
    for (const e of entries) {
      for (const m of e.body.matchAll(/<(Block|Quote)\b([^>]*)>/g)) {
        const attrs = m[2];
        const from = /\bfrom="([^"]+)"/.exec(attrs)?.[1];
        if (from === 'transcribed' || from === 'secondary' || m[1] === 'Quote') {
          const source = /\bsource="([^"]+)"/.exec(attrs)?.[1];
          expect(source, `${e.file} 的 ${m[1]} 缺 source`).toBeTruthy();
          // 出处可以写「待补（说明）」，但不能只有一个空话；带解释的占位允许保留
          expect(source.length, `${e.file} 的 source 太短`).toBeGreaterThan(3);
        }
      }
    }
  });

  it('关系两端都存在，类型合法，未核实的关系显式标注', () => {
    const types = new Set(['影响', '批判', '师承', '对话', '平行', '误读']);
    for (const e of entries.filter((x) => x.file.startsWith('content/relations/'))) {
      expect(ids.has(e.data.from), `${e.file} 的 from ${e.data.from} 不存在`).toBe(true);
      expect(ids.has(e.data.to), `${e.file} 的 to ${e.data.to} 不存在`).toBe(true);
      expect(types.has(e.data.type)).toBe(true);
      expect(typeof e.data.verified).toBe('boolean');
      expect(e.data.summary.length).toBeGreaterThan(8);
    }
  });

  it('人物档案的强调色合法、成熟度合法', () => {
    for (const e of entries.filter((x) => x.file.endsWith('index.mdx'))) {
      expect(e.data.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(['种子', '生长中', '成形']).toContain(e.data.maturity);
      expect(thinkerIds.has(e.data.id)).toBe(true);
    }
  });

  it('时间线事件按可解析日期给出，且 kind 合法', () => {
    const kinds = new Set(['生活', '写作', '出版', '相遇', '历史背景']);
    for (const e of entries.filter((x) => x.file.endsWith('life.mdx'))) {
      for (const ev of e.data.events ?? []) {
        expect(String(ev.date)).toMatch(/^-?\d{4}(-\d{2}(-\d{2})?)?$/);
        expect(kinds.has(ev.kind), `${e.file}: ${ev.kind}`).toBe(true);
        expect(ev.title).toBeTruthy();
      }
    }
  });

  it('正文里没有未渲染的 TODO/FIXME 占位', () => {
    for (const e of entries) {
      expect(e.body).not.toMatch(/\b(TODO|FIXME|XXX)\b/);
    }
  });
});
