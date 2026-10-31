#!/usr/bin/env node
/**
 * npm run sync —— 拉取 SilverBullet，回写双向区，生成入口页。
 *
 * 用法：
 *   npm run sync                 默认：拉取引用 + 双向同步 + 生成入口页
 *   npm run sync -- --dry-run    只报告将要做什么
 *   npm run sync -- --pull-only  只拉取与生成入口页，不回写 SilverBullet
 *   npm run sync -- --local ./tmp/sb   用本地文件夹适配器（离线开发与测试）
 *
 * 配置见 .env.example：ATLAS_NOTES_ADAPTER=silverbullet|local-folder
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { silverbulletAdapter } from './adapters/silverbullet.mjs';
import { localFolderAdapter } from './adapters/local-folder.mjs';
import { syncJournal, syncReferences, generateIndexPages, loadState, loadAtlasSnapshot } from './lib/sync.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'content');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const dryRun = flag('dry-run');
const pullOnly = flag('pull-only');

const adapterName = value('local') ? 'local-folder' : process.env.ATLAS_NOTES_ADAPTER || 'silverbullet';

function makeAdapter() {
  if (adapterName === 'local-folder') {
    const dir = value('local') || process.env.ATLAS_NOTES_LOCAL_DIR;
    if (!dir) throw new Error('local-folder 适配器需要 --local <目录> 或 ATLAS_NOTES_LOCAL_DIR');
    return localFolderAdapter(path.resolve(root, dir));
  }
  const baseUrl = process.env.SB_URL;
  const auth = process.env.SB_USER;
  if (!baseUrl) throw new Error('缺少 SB_URL。请在 .env 里按 .env.example 配置（见 README）。');
  return silverbulletAdapter({ baseUrl, auth });
}

async function main() {
  const adapter = makeAdapter();
  console.log(`适配器：${adapter.name}${dryRun ? '（dry-run，不写入）' : ''}`);

  const siteUrl = process.env.ATLAS_SITE_URL || '';

  const refs = await syncReferences({ adapter, contentDir, siteUrl, dryRun });
  console.log(`引用：${refs.written.length} 篇带 atlas 标记的笔记 → content/sb-cache/`);

  if (!pullOnly) {
    const state = await loadState(path.join(root, 'sync', 'state.json'));
    const r = await syncJournal({ adapter, contentDir, state, dryRun });
    console.log(
      `双向区：拉取 ${r.pulled.length}，回写 ${r.pushed.length}，未变 ${r.unchanged}，冲突 ${r.conflicts.length}`,
    );
    for (const p of r.pulled) console.log(`  ← ${p}`);
    for (const p of r.pushed) console.log(`  → ${p}`);
    for (const c of r.conflicts) console.log(`  ! 冲突：${c.rel} → 对方版本存为 ${path.relative(root, c.conflictPath)}，请手动合并`);
    for (const d of r.deleted) console.log(`  ? ${d} 只在一侧存在（删除不自动同步），请确认是否保留`);
    if (r.conflicts.length) {
      console.log('\n有冲突未解决：已保留双方内容，合并后删除 .conflict.md 再运行一次。');
      process.exitCode = 2;
    }
  }

  const snapshot = await loadAtlasSnapshot(contentDir);
  const idx = await generateIndexPages({ adapter, atlas: snapshot, siteUrl, dryRun });
  console.log(`入口页：写入 ${idx.written.length} 篇到 atlas/_index/`);
  if (idx.skipped.length) console.log(`  跳过 ${idx.skipped.length} 篇（同名文件不是 Atlas 生成的，未覆盖）`);
}

main().catch((e) => {
  console.error('同步失败：', e.message);
  process.exit(1);
});
