#!/usr/bin/env node
/**
 * 把 content/thinkers/<slug>/portrait.{jpg,jpeg,png,webp,gif} 复制到
 * public/portraits/<slug>.<ext>，供 <img src="/portraits/..."> 使用。
 */
import { readdir, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const thinkersDir = path.join(root, 'content', 'thinkers');
const outDir = path.join(root, 'public', 'portraits');
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const NAMES = new Set(['portrait', 'photo', '照片']);

async function main() {
  await mkdir(outDir, { recursive: true });
  let copied = 0;
  const dirs = await readdir(thinkersDir, { withFileTypes: true }).catch(() => []);
  for (const ent of dirs) {
    if (!ent.isDirectory()) continue;
    const slug = ent.name;
    const dir = path.join(thinkersDir, slug);
    const files = await readdir(dir).catch(() => []);
    const hit = files.find((f) => {
      const ext = path.extname(f).toLowerCase();
      const base = path.basename(f, path.extname(f));
      return EXTS.has(ext) && NAMES.has(base);
    });
    if (!hit) continue;
    const ext = path.extname(hit).toLowerCase();
    const dest = path.join(outDir, `${slug}${ext}`);
    const src = path.join(dir, hit);
    await copyFile(src, dest);
    copied += 1;
    console.log(`肖像：${path.relative(root, src)} → ${path.relative(root, dest)}`);
  }
  if (!copied) console.log('肖像：content/thinkers/*/portrait.* 无新文件可复制（无图时用字母占位）。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
