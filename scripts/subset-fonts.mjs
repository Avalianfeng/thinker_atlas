#!/usr/bin/env node
/**
 * 字体子集化：收集 content/ 与 src/ 里实际用到的字符，从 @fontsource 的字体文件裁出子集，
 * 按字频切成若干块（首块最常用，先到），写入 public/fonts/ 与 src/styles/fonts.css。
 *
 * 这样首屏只需下最常用的那一两块，后面的按需补，单页字体总量远小于整包。
 * 构建与预览前自动运行（prebuild / predev）。
 */
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fs = (p) => path.join(root, p);
const OUT_DIR = fs('public/fonts');
const CSS_OUT = fs('src/styles/fonts.css');
const FS = (pkg, file) => fs(`node_modules/@fontsource/${pkg}/files/${file}`);

const BASE_CHARS =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~' +
  '，。、；：？！“”‘’（）《》〈〉【】—…·「」『』〔〕　▾▸□■●○→←↔∥／' +
  '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处理世车价严龙飞';

async function walk(dir, exts, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, exts, acc);
    else if (exts.some((x) => e.name.endsWith(x))) acc.push(p);
  }
  return acc;
}

/**
 * 统计字符出现次数，按字面用途分组，避免每种字重都带全量汉字：
 *  - all   正文（宋体 400）
 *  - bold  仅加粗处（宋体 600），很少
 *  - ui    页面 chrome、frontmatter、标题行、旁注与批注标题（黑体）
 */
async function collectChars() {
  const files = [
    ...(await walk(fs('content'), ['.md', '.mdx'])),
    ...(await walk(fs('src'), ['.astro', '.ts', '.mjs'])),
  ];
  const all = new Map();
  const bold = new Map();
  const ui = new Map();
  const bump = (map, ch) => map.set(ch, (map.get(ch) ?? 0) + 1);
  for (const ch of BASE_CHARS) bump(all, ch);
  for (const ch of BASE_CHARS) bump(ui, ch);
  for (const f of files) {
    const text = await readFile(f, 'utf8');
    for (const ch of text) bump(all, ch);
    if (/\.(astro|ts|mjs)$/.test(f)) for (const ch of text) bump(ui, ch);
    for (const line of text.split('\n')) {
      if (/^#{1,6}\s/.test(line)) for (const ch of line.replace(/<[^>]*>/g, '')) bump(ui, ch);
    }
    // frontmatter 里只有这些字段会以黑体出现在页面上（名字、领域、标题、分期名、事件类名等）；
    // intro / definition / summary 之类是正文，用宋体，不算进黑体子集。
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    if (fm) {
      for (const line of fm[1].split('\n')) {
        if (/^\s*(zh|en|original|fields|maturity|title|label|place|kind|alt_titles|editions|reading):/.test(line)) {
          for (const ch of line.replace(/^\s*[a-z_]+:\s*/, '')) bump(ui, ch);
        }
        if (/^\s*-\s+\S/.test(line) && line.length < 40) {
          // 列表项（领域、译名、版本）也常以黑体显示
          for (const ch of line.replace(/^\s*-\s+/, '')) bump(ui, ch);
        }
      }
    }
    // 加粗：宋体 600 只需这些字（Markdown 的 **粗体** 与 <strong>，以及标题行里的强调）
    for (const m of text.matchAll(/\*\*([^*]+)\*\*|<strong>([\s\S]*?)<\/strong>/g)) {
      for (const ch of (m[1] ?? m[2] ?? '').replace(/<[^>]*>/g, '')) bump(bold, ch);
    }

    // 旁注与批注标题、概念卡等以黑体显示
    for (const m of text.matchAll(/<(Sidenote|Note)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      for (const ch of m[2].replace(/<[^>]*>/g, '')) bump(ui, ch);
    }
  }
  return { all, bold, ui };
}

/** fontsource 的 unicode.json：某个子集的码位区间。 */
async function rangeOf(pkg, subset) {
  const json = JSON.parse(await readFile(fs(`node_modules/@fontsource/${pkg}/unicode.json`), 'utf8'));
  const spec = json[subset];
  if (!spec) return null;
  return spec.split(',').map((r) => {
    const [a, b] = r.trim().replace(/^U\+/i, '').split('-');
    const lo = parseInt(a, 16);
    return [lo, b ? parseInt(b, 16) : lo];
  });
}

const inRanges = (cp, ranges) => Boolean(ranges) && ranges.some(([a, b]) => cp >= a && cp <= b);

function toRange(cps) {
  const sorted = [...cps].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    const h = (n) => n.toString(16).toUpperCase();
    out.push(i === j ? `U+${h(sorted[i])}` : `U+${h(sorted[i])}-${h(sorted[j])}`);
    i = j;
  }
  return out.join(', ');
}

// 正文栈里的西文字体不接管中西共用的标点（引号、破折号、省略号），以免中文标点变成西文字形。
const SHARED_PUNCT = new Set([0x2014, 0x2015, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026, 0x00b7]);

// 每种字重只带自己会用到的字：宋体 400 是正文全量，宋体 600 只是加粗处，黑体只带页面 chrome 与标题。
// 缺字时按字体栈回退到宋体，只是字形不同，不会出豆腐块。
const FACES = [
  // 字重只保留真正用到的：正文宋体 400 与加粗 600；黑体用一个文件覆盖 400–600
  // （中文一个字重就是几十 KB，不该为字重重复下载）。每块按字频切片，首屏只需最常用的那一块。
  { family: 'Noto Serif SC', pkg: 'noto-serif-sc', weights: [400], set: 'all' },
  { family: 'Noto Serif SC', pkg: 'noto-serif-sc', weights: [600], set: 'bold' },
  { family: 'Noto Sans SC', pkg: 'noto-sans-sc', weights: [400], set: 'ui', weightRange: '400 600' },
];
const GARAMOND = [
  { weight: 400, style: 'normal' },
  { weight: 400, style: 'italic' },
  { weight: 500, style: 'normal' },
];

/** 按字频切成若干块：第一块最常用（约 350 字），后面每块约 500 字。 */
function chunkByFrequency(counts, firstSize = 350, chunkSize = 500) {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].codePointAt(0) - b[0].codePointAt(0));
  const cps = sorted.map(([ch]) => ch.codePointAt(0)).filter((n) => n >= 0x20);
  const chunks = [];
  let i = 0;
  while (i < cps.length) {
    const size = chunks.length === 0 ? firstSize : chunkSize;
    chunks.push(cps.slice(i, i + size));
    i += size;
  }
  return chunks;
}

async function main() {
  const sets = await collectChars();
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const css = ['/* 由 scripts/subset-fonts.mjs 生成，勿手改 */'];
  let total = 0;
  const written = [];

  const emit = async (name, source, codepoints, faces) => {
    if (!codepoints.length) return;
    const buf = await subsetFont(await readFile(source), String.fromCodePoint(...codepoints), { targetFormat: 'woff2' });
    const hash = createHash('sha1').update(buf).digest('hex').slice(0, 8);
    const file = `${name}.${hash}.woff2`;
    await writeFile(path.join(OUT_DIR, file), buf);
    total += buf.length;
    written.push({ file, bytes: buf.length, chars: codepoints.length });
    for (const f of faces) {
      const list = f.only ? codepoints.filter(f.only) : codepoints;
      const ranges = list.length ? toRange(list) : null;
      if (!ranges) continue;
      css.push(
        `@font-face{font-family:'${f.family}';font-style:${f.style || 'normal'};font-weight:${f.weightRange || f.weight};font-display:swap;` +
          `src:url(/fonts/${file}) format('woff2');unicode-range:${ranges};${f.extra || ''}}`,
      );
    }
    console.log(`  ${file}  ${(buf.length / 1024).toFixed(1)} KB  (${codepoints.length} 字符)`);
  };

  for (const f of FACES) {
    const counts = sets[f.set];
    const lazy = chunkByFrequency(counts);
    for (const w of f.weights) {
      for (const [i, chunk] of lazy.entries()) {
        await emit(`${f.pkg}-${w}-${String(i).padStart(2, '0')}`, FS(f.pkg, `${f.pkg}-chinese-simplified-${w}-normal.woff2`), chunk, [
          { family: f.family, weight: w },
        ]);
      }
    }
  }

  const all = sets.all;
  const garamondLatin = await rangeOf('eb-garamond', 'latin');
  const garamondLatinExt = await rangeOf('eb-garamond', 'latin-ext');
  const latinCps = [...all.keys()]
    .map((c) => c.codePointAt(0))
    .filter((n) => n >= 0x20 && (inRanges(n, garamondLatin) || inRanges(n, garamondLatinExt)));
  for (const g of GARAMOND) {
    const suffix = g.style === 'italic' ? 'italic' : 'normal';
    await emit(`eb-garamond-${g.weight}-${suffix}`, FS('eb-garamond', `eb-garamond-latin-${g.weight}-${suffix}.woff2`), latinCps, [
      { family: 'EB Garamond', weight: g.weight, style: g.style },
      {
        family: 'EB Garamond Text',
        weight: g.weight,
        style: g.style,
        only: (c) => !SHARED_PUNCT.has(c) && c !== 0x20,
        extra: 'size-adjust:108%;',
      },
    ]);
  }

  await writeFile(CSS_OUT, css.join('\n') + '\n');
  const first = written.filter((w) => w.file.includes('-00.'));
  console.log(
    `字体子集：${written.length} 个文件，合计 ${(total / 1024).toFixed(0)} KB；` +
      `首屏首块 ${first.map((f) => `${f.file.split('.')[0]} ${(f.bytes / 1024).toFixed(0)}KB`).join('、')}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
