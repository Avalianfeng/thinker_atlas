#!/usr/bin/env node
/**
 * 把 content/people/<id>/ 下的图片复制到：
 * - public/portraits/<id>.<ext>（肖像：portrait|photo|照片.*）
 * - public/people/<id>/*（全部图片，供正文相对路径改写后访问）
 */
import { readdir, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const peopleDir = path.join(root, 'content', 'people');
const portraitsOut = path.join(root, 'public', 'portraits');
const peopleOut = path.join(root, 'public', 'people');
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const PORTRAIT_NAMES = new Set(['portrait', 'photo', '照片']);

async function main() {
  await mkdir(portraitsOut, { recursive: true });
  await mkdir(peopleOut, { recursive: true });
  let portraits = 0;
  let assets = 0;
  const dirs = await readdir(peopleDir, { withFileTypes: true }).catch(() => []);
  for (const ent of dirs) {
    if (!ent.isDirectory()) continue;
    const slug = ent.name;
    const dir = path.join(peopleDir, slug);
    const outPerson = path.join(peopleOut, slug);
    await mkdir(outPerson, { recursive: true });
    const files = await readdir(dir).catch(() => []);
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (!EXTS.has(ext)) continue;
      const src = path.join(dir, f);
      const destAsset = path.join(outPerson, f);
      await copyFile(src, destAsset);
      assets += 1;
      console.log(`图：${path.relative(root, src)} → ${path.relative(root, destAsset)}`);

      const base = path.basename(f, path.extname(f));
      if (PORTRAIT_NAMES.has(base)) {
        const dest = path.join(portraitsOut, `${slug}${ext}`);
        await copyFile(src, dest);
        portraits += 1;
        console.log(`肖像：${path.relative(root, src)} → ${path.relative(root, dest)}`);
      }
    }
  }
  if (!portraits) console.log('肖像：content/people/*/portrait.* 无新文件可复制（无图时用字母占位）。');
  if (!assets) console.log('图：content/people/ 下无图片可复制。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
