#!/usr/bin/env node
/**
 * 字体子集：把 atlas/ 与 src/ 里真正用到的字裁出来，做成几个 woff2，写进 public/fonts/。
 * 不做分块、不做字频排序——一个文件就是一套字。改完内容重新 build 即可。
 */
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import subsetFont from 'subset-font';

const root = process.cwd();
const at = (p) => path.join(root, p);
const OUT = at('public/fonts');

// 界面里固定出现的字（页脚、空状态、返回链接等）
const UI =
  '夜间日间时间线全部还没有人物文件夹个这新建一就行的内容下思想者图谱←·' +
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~' +
  '，。、；：？！“”‘’（）《》〈〉【】—…·「」『』　';

async function walk(dir, exts, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, exts, acc);
    else if (exts.some((x) => e.name.endsWith(x))) acc.push(p);
  }
  return acc;
}

async function chars() {
  const files = [...(await walk(at('atlas'), ['.md'])), ...(await walk(at('src'), ['.astro', '.ts', '.css']))];
  const set = new Set([...UI]);
  for (const f of files) for (const ch of await readFile(f, 'utf8')) set.add(ch);
  // 只保留真正能画出来的字符，跳过控制符
  return [...set].filter((ch) => ch.codePointAt(0) >= 0x20).join('');
}

async function subset(name, source, text, range) {
  const buf = await subsetFont(await readFile(source), text, { targetFormat: 'woff2' });
  const file = `${name}.${createHash('sha1').update(buf).digest('hex').slice(0, 8)}.woff2`;
  await writeFile(path.join(OUT, file), buf);
  return { file, kb: (buf.length / 1024).toFixed(1), range };
}

const FONTS = [
  {
    name: 'serif-sc',
    family: 'Noto Serif SC',
    weight: '400',
    src: 'node_modules/@fontsource/noto-serif-sc/files/noto-serif-sc-chinese-simplified-400-normal.woff2',
  },
  {
    name: 'garamond',
    family: 'EB Garamond',
    weight: '400',
    src: 'node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-400-normal.woff2',
  },
];

async function main() {
  const text = await chars();
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const css = ['/* 由 scripts/subset-fonts.mjs 生成，勿手改 */'];
  const made = [];
  for (const f of FONTS) {
    const out = await subset(f.name, at(f.src), text);
    made.push(`${out.file} ${out.kb}KB`);
    css.push(
      `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};font-display:swap;` +
        `src:url(/fonts/${out.file}) format('woff2');}`,
    );
  }
  await writeFile(path.join(OUT, 'fonts.css'), css.join('\n') + '\n');
  console.log(`字体子集：${text.length} 字 → ${made.join('、')}`);
}

main().catch((e) => {
  console.error('字体子集失败：', e.message);
  process.exit(1);
});
