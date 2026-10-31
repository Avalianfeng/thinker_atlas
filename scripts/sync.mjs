#!/usr/bin/env node
/**
 * npm run sync —— 遗留 SilverBullet 同步入口（默认禁用）。
 *
 * Atlas 独立运行：展馆真源 = git content/，不做 SB 双向，也不默认拉取。
 *
 * 用法：
 *   npm run sync                      默认：no-op，打印说明后退出 0
 *   npm run sync -- --enable          仅遗留「引用拉取」→ content/sb-cache/
 *   npm run sync -- --enable --push   额外启用 journal 双向（含回写，不推荐）
 *   npm run sync -- --enable --write-index  生成 atlas/_index（默认不做）
 *   npm run sync -- --enable --dry-run
 *   npm run sync -- --enable --local ./tmp/sb
 *
 * 库函数仍留在 scripts/lib/sync.mjs，供单测与显式 --enable 使用。
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

const enabled = flag('enable') || process.env.ATLAS_SYNC_ENABLED === '1';
const dryRun = flag('dry-run');
const allowPush = flag('push');
const writeIndex = flag('write-index');

if (!enabled) {
  console.log('Atlas 独立运行：npm run sync 默认已禁用。');
  console.log('展馆真源 = git content/；站点不依赖 SilverBullet，也不做双向同步。');
  console.log('若需遗留拉取逻辑，显式传 --enable（回写需再加 --push；入口页需 --write-index）。');
  process.exit(0);
}

const adapterName = value('local') ? 'local-folder' : process.env.ATLAS_NOTES_ADAPTER || 'silverbullet';

function makeAdapter() {
  if (adapterName === 'local-folder') {
    const dir = value('local') || process.env.ATLAS_NOTES_LOCAL_DIR;
    if (!dir) throw new Error('local-folder 适配器需要 --local <目录> 或 ATLAS_NOTES_LOCAL_DIR');
    return localFolderAdapter(path.resolve(root, dir));
  }
  const baseUrl = process.env.SB_URL;
  const auth = process.env.SB_USER;
  if (!baseUrl) throw new Error('缺少 SB_URL。遗留同步已不推荐；独立 Atlas 请直接编辑 content/。');
  return silverbulletAdapter({ baseUrl, auth });
}

async function main() {
  console.warn('警告：你正在使用已弃用的 SilverBullet 同步（--enable）。展馆真源仍应是 git content/。');
  const adapter = makeAdapter();
  console.log(`适配器：${adapter.name}${dryRun ? '（dry-run，不写入）' : ''}`);

  const siteUrl = process.env.ATLAS_SITE_URL || '';

  const refs = await syncReferences({ adapter, contentDir, siteUrl, dryRun });
  console.log(`引用：${refs.written.length} 篇 → content/sb-cache/（遗留缓存）`);

  if (allowPush) {
    const state = await loadState(path.join(root, 'sync', 'state.json'));
    const r = await syncJournal({ adapter, contentDir, state, dryRun });
    console.log(
      `journal 双向：拉取 ${r.pulled.length}，回写 ${r.pushed.length}，未变 ${r.unchanged}，冲突 ${r.conflicts.length}`,
    );
    for (const p of r.pulled) console.log(`  ← ${p}`);
    for (const p of r.pushed) console.log(`  → ${p}`);
    for (const c of r.conflicts) console.log(`  ! 冲突：${c.rel} → ${path.relative(root, c.conflictPath)}`);
    for (const d of r.deleted) console.log(`  ? ${d} 只在一侧存在`);
    if (r.conflicts.length) {
      console.log('\n有冲突未解决：合并后删除 .conflict.md 再运行。');
      process.exitCode = 2;
    }
  } else {
    console.log('journal 双向：跳过（默认禁用；需要时加 --push，不推荐）');
  }

  if (writeIndex) {
    const snapshot = await loadAtlasSnapshot(contentDir);
    const idx = await generateIndexPages({ adapter, atlas: snapshot, siteUrl, dryRun });
    console.log(`入口页：写入 ${idx.written.length} 篇到 atlas/_index/`);
    if (idx.skipped.length) console.log(`  跳过 ${idx.skipped.length} 篇`);
  } else {
    console.log('入口页：跳过（默认不做 atlas/_index；需要时加 --write-index）');
  }
}

main().catch((e) => {
  console.error('同步失败：', e.message);
  process.exit(1);
});
