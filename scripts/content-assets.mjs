/**
 * 把 atlas/ 里文件夹内的图片复制到 dist/atlas/，这样 md 里写相对路径就能显示。
 * 只搬图片，不碰 .md；构建时一次性复制，没有监听、没有缓存。
 */
import { readdir, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const IMAGE = /\.(jpe?g|png|webp|avif|gif|svg)$/i;

async function walk(dir, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, acc);
    else if (IMAGE.test(e.name)) acc.push(p);
  }
  return acc;
}

export default function contentAssets() {
  let root = process.cwd();
  return {
    name: 'atlas:atlas-images',
    hooks: {
      'astro:config:setup': ({ config }) => {
        root = config.root.pathname;
      },
      'astro:build:done': async ({ dir }) => {
        const files = await walk(path.join(root, 'atlas'));
        for (const f of files) {
          const rel = path.relative(path.join(root, 'atlas'), f);
          const out = path.join(dir.pathname, 'atlas', rel);
          await mkdir(path.dirname(out), { recursive: true });
          await copyFile(f, out);
        }
        if (files.length) console.log(`atlas 图片：${files.length} 张 → dist/atlas/`);
      },
    },
  };
}
