import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { localFolderAdapter } from '../scripts/adapters/local-folder.mjs';
import { syncJournal, syncReferences, generateIndexPages, loadState, sha, JOURNAL_DIR, INDEX_DIR } from '../scripts/lib/sync.mjs';

async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), 'atlas-test-'));
  const sbDir = path.join(root, 'sb');
  const contentDir = path.join(root, 'content');
  await mkdir(path.join(sbDir, 'atlas'), { recursive: true });
  await mkdir(path.join(contentDir, 'journal'), { recursive: true });
  return { root, sbDir, contentDir, adapter: localFolderAdapter(sbDir) };
}

const writeSb = async (sbDir, rel, content) => {
  await mkdir(path.dirname(path.join(sbDir, rel)), { recursive: true });
  await writeFile(path.join(sbDir, rel), content);
};
const writeLocal = async (contentDir, rel, content) => {
  await mkdir(path.dirname(path.join(contentDir, 'journal', rel)), { recursive: true });
  await writeFile(path.join(contentDir, 'journal', rel), content);
};
const read = (p) => readFile(p, 'utf8');

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

describe('双向同步 atlas/ ⇄ content/journal/', () => {
  let env;
  beforeEach(async () => {
    env = await setup();
  });

  const run = (state, opts = {}) => syncJournal({ adapter: env.adapter, contentDir: env.contentDir, state, log: () => {}, ...opts });
  const stateFile = () => path.join(env.contentDir, '..', 'sync', 'state.json');

  it('拉取只存在于 SilverBullet 的随笔，并记录哈希', async () => {
    await writeSb(env.sbDir, 'atlas/读书笔记.md', '---\ntitle: 读书笔记\n---\n\n5.6 那句话。\n');
    const r = await run(await loadState(stateFile()));
    expect(r.pulled).toEqual(['读书笔记.md']);
    expect(await read(path.join(env.contentDir, 'journal', '读书笔记.md'))).toContain('5.6 那句话');
    const state = await loadState(stateFile());
    expect(state.files['读书笔记.md'].note).toBe(`${JOURNAL_DIR}/读书笔记.md`);
    expect(state.files['读书笔记.md'].hash).toBe(sha(await read(path.join(env.contentDir, 'journal', '读书笔记.md'))));
  });

  it('本地改动回写到 SilverBullet（单向变更）', async () => {
    await writeSb(env.sbDir, 'atlas/a.md', 'v1\n');
    await run(await loadState(stateFile()));
    await writeLocal(env.contentDir, 'a.md', 'v1 改过\n');
    const r = await run(await loadState(stateFile()));
    expect(r.pushed).toEqual(['a.md']);
    expect(await read(path.join(env.sbDir, 'atlas/a.md'))).toBe('v1 改过\n');
  });

  it('远端改动拉回本地（单向变更）', async () => {
    await writeSb(env.sbDir, 'atlas/a.md', 'v1\n');
    await run(await loadState(stateFile()));
    await writeSb(env.sbDir, 'atlas/a.md', '远端改\n');
    const r = await run(await loadState(stateFile()));
    expect(r.pulled).toEqual(['a.md']);
    expect(await read(path.join(env.contentDir, 'journal', 'a.md'))).toBe('远端改\n');
  });

  it('两边都改 → 冲突文件，双方内容都不丢', async () => {
    await writeSb(env.sbDir, 'atlas/a.md', 'base\n');
    await run(await loadState(stateFile()));
    await writeSb(env.sbDir, 'atlas/a.md', '远端版本\n');
    await writeLocal(env.contentDir, 'a.md', '本地版本\n');
    const r = await run(await loadState(stateFile()));
    expect(r.conflicts.map((c) => c.rel)).toEqual(['a.md']);
    expect(await read(path.join(env.contentDir, 'journal', 'a.md'))).toBe('本地版本\n');
    const conflict = await read(path.join(env.contentDir, 'journal', 'a.conflict.md'));
    expect(conflict).toContain('远端版本');
    expect(conflict).toContain('冲突');
    // 远端原文没有被覆盖
    expect(await read(path.join(env.sbDir, 'atlas/a.md'))).toBe('远端版本\n');
    // 冲突未解决前状态不前进：再跑一次仍然报冲突
    const again = await run(await loadState(stateFile()));
    expect(again.conflicts.length).toBe(1);
  });

  it('两边同名但都没有同步记录 → 也按冲突处理', async () => {
    await writeSb(env.sbDir, 'atlas/a.md', '远端\n');
    await writeLocal(env.contentDir, 'a.md', '本地\n');
    const r = await run({ version: 1, files: {} });
    expect(r.conflicts.length).toBe(1);
    expect(await read(path.join(env.contentDir, 'journal', 'a.conflict.md'))).toContain('远端');
    expect(await read(path.join(env.contentDir, 'journal', 'a.md'))).toBe('本地\n');
  });

  it('删除不自动同步：远端删了，本地保留并提示', async () => {
    await writeSb(env.sbDir, 'atlas/a.md', 'x\n');
    await run(await loadState(stateFile()));
    await writeFile(path.join(env.sbDir, 'atlas/a.md'), ''); // 空文件仍在
    const { rm } = await import('node:fs/promises');
    await rm(path.join(env.sbDir, 'atlas/a.md'));
    const r = await run(await loadState(stateFile()));
    expect(r.deleted).toContain('a.md');
    expect(await exists(path.join(env.contentDir, 'journal', 'a.md'))).toBe(true);
    expect(await read(path.join(env.contentDir, 'journal', 'a.md'))).toBe('x\n');
  });

  it('冲突文件不会被当作新随笔同步回 SilverBullet', async () => {
    await writeSb(env.sbDir, 'atlas/a.md', 'base\n');
    await run(await loadState(stateFile()));
    await writeSb(env.sbDir, 'atlas/a.md', 'r\n');
    await writeLocal(env.contentDir, 'a.md', 'l\n');
    await run(await loadState(stateFile()));
    const r = await run(await loadState(stateFile()));
    expect(r.pushed).not.toContain('a.conflict.md');
    expect(await exists(path.join(env.sbDir, 'atlas/a.conflict.md'))).toBe(false);
  });

  it('dry-run 不写任何文件', async () => {
    await writeSb(env.sbDir, 'atlas/a.md', 'x\n');
    const r = await run({ version: 1, files: {} }, { dryRun: true });
    expect(r.pulled).toEqual(['a.md']);
    expect(await exists(path.join(env.contentDir, 'journal', 'a.md'))).toBe(false);
  });

  it('忽略 atlas/_index/ 下的生成页', async () => {
    await writeSb(env.sbDir, 'atlas/_index/维特根斯坦.md', '# x\n');
    await writeSb(env.sbDir, 'atlas/正文.md', 'y\n');
    const r = await run({ version: 1, files: {} });
    expect(r.pulled).toEqual(['正文.md']);
  });
});

describe('引用拉取（atlas: 标记的任意笔记）', () => {
  let env;
  beforeEach(async () => {
    env = await setup();
  });

  it('按 frontmatter 的 atlas: 与 #atlas/<人物> 标签拉取，并跳过双向区', async () => {
    await writeSb(env.sbDir, 'notes/语言.md', '---\ntitle: 语言\natlas: wittgenstein/language-games\n---\n\n正文 A\n');
    await writeSb(env.sbDir, 'notes/荣格.md', '# 梦\n\n梦里的 #atlas/jung 是什么\n');
    await writeSb(env.sbDir, 'notes/无关.md', '---\ntitle: x\n---\n\n没有标记\n');
    await writeSb(env.sbDir, 'atlas/随笔.md', '---\natlas: wittgenstein\n---\n\n双向区的不进缓存\n');

    const r = await syncReferences({ adapter: env.adapter, contentDir: env.contentDir, siteUrl: 'https://atlas.test' });
    expect(r.written.sort()).toEqual(['notes/语言.md', 'notes/荣格.md'].sort());

    const cached = await read(path.join(env.contentDir, 'sb-cache/notes/语言.md'));
    expect(cached).toContain('atlas: ["atlas:wittgenstein/language-games"]');
    expect(cached).toContain('https://atlas.test/notes/%E8%AF%AD%E8%A8%80/');
    expect(cached).toContain('正文 A');
    expect(cached).not.toContain('frontmatter'); // 只保留正文

    expect(await exists(path.join(env.contentDir, 'sb-cache/notes/无关.md'))).toBe(false);
  });

  it('重跑会清掉不再被引用的缓存', async () => {
    await writeSb(env.sbDir, 'notes/a.md', '---\natlas: jung\n---\n\na\n');
    await syncReferences({ adapter: env.adapter, contentDir: env.contentDir });
    expect(await exists(path.join(env.contentDir, 'sb-cache/notes/a.md'))).toBe(true);
    await writeFile(path.join(env.sbDir, 'notes/a.md'), '---\ntitle: 去掉标记\n---\n\na\n');
    await syncReferences({ adapter: env.adapter, contentDir: env.contentDir });
    expect(await exists(path.join(env.contentDir, 'sb-cache/notes/a.md'))).toBe(false);
  });
});

describe('入口页生成（Atlas → SilverBullet 单向）', () => {
  let env;
  beforeEach(async () => {
    env = await setup();
  });

  const atlas = {
    thinkers: [
      {
        id: 'atlas:wittgenstein',
        data: {
          id: 'atlas:wittgenstein',
          name: { zh: '维特根斯坦', en: 'Wittgenstein', original: 'Wittgenstein' },
          born: { date: '1889' },
          died: { date: '1951' },
          maturity: '生长中',
          intro: '一句话导言',
        },
      },
    ],
    concepts: [
      { id: 'atlas:wittgenstein/language-games', data: { id: 'atlas:wittgenstein/language-games', title: '语言游戏', original: 'Sprachspiel', definition: '意义即用法', questions: ['意义是什么？'] } },
    ],
    works: [],
  };

  it('生成人物页与概念页，带生成标记与网站链接', async () => {
    const r = await generateIndexPages({ adapter: env.adapter, atlas, siteUrl: 'https://atlas.test', log: () => {} });
    expect(r.written).toContain(`${INDEX_DIR}/维特根斯坦.md`);
    expect(r.written).toContain(`${INDEX_DIR}/维特根斯坦/语言游戏.md`);
    const page = await read(path.join(env.sbDir, 'atlas/_index/维特根斯坦.md'));
    expect(page).toContain('由 Atlas 生成，勿改');
    expect(page).toContain('https://atlas.test/thinkers/wittgenstein/');
    expect(page).toContain('语言游戏');
    const concept = await read(path.join(env.sbDir, 'atlas/_index/维特根斯坦/语言游戏.md'));
    expect(concept).toContain('[[atlas/_index/维特根斯坦]]');
  });

  it('同名文件若不是 Atlas 生成的，不覆盖', async () => {
    await writeSb(env.sbDir, 'atlas/_index/维特根斯坦.md', '# 我自己写的\n');
    const r = await generateIndexPages({ adapter: env.adapter, atlas, siteUrl: '', log: () => {} });
    expect(r.skipped).toContain(`${INDEX_DIR}/维特根斯坦.md`);
    expect(await read(path.join(env.sbDir, 'atlas/_index/维特根斯坦.md'))).toBe('# 我自己写的\n');
  });

  it('已生成的页面可重复覆盖（幂等）', async () => {
    await generateIndexPages({ adapter: env.adapter, atlas, siteUrl: '', log: () => {} });
    const first = await read(path.join(env.sbDir, 'atlas/_index/维特根斯坦.md'));
    const r = await generateIndexPages({ adapter: env.adapter, atlas, siteUrl: '', log: () => {} });
    expect(r.skipped).toEqual([]);
    expect(await read(path.join(env.sbDir, 'atlas/_index/维特根斯坦.md'))).toBe(first);
  });
});
