#!/usr/bin/env node
/**
 * npm run new <slug> —— 生成一位新人物的目录骨架（含各文件 frontmatter 模板）。
 * 不会覆盖已有文件；ID 一律用 atlas:<slug>。
 */
import path from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];

if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('用法：npm run new <slug>（小写字母、数字、连字符，例如 feyerabend）');
  process.exit(1);
}

const dir = path.join(root, 'content', 'thinkers', slug);

async function main() {
  try {
    await readFile(path.join(dir, 'index.mdx'));
    console.error(`content/thinkers/${slug}/ 已存在，未改动。`);
    process.exit(1);
  } catch {
    /* 不存在，继续 */
  }

  // 加入顺序 = 现有人物数 + 1
  const { readdir } = await import('node:fs/promises');
  let order = 1;
  try {
    order = (await readdir(path.join(root, 'content', 'thinkers'), { withFileTypes: true })).filter((e) => e.isDirectory()).length + 1;
  } catch {}

  await mkdir(path.join(dir, 'thought'), { recursive: true });
  await mkdir(path.join(dir, 'works'), { recursive: true });

  const files = {
    'index.mdx': `---
id: atlas:${slug}
name:
  zh: 待填中文名
  en: TODO
  original: ''
born:
  date: '1900'
  place: ''
died:
  date: '1990'
  place: ''
fields: []
maturity: 种子
accent: '#7A7A6E'
order: ${order}
added: '${new Date().toISOString().slice(0, 10)}'
intro: 一句话导言（待写）
periods: []
visibility: private
---

## 这个人

<Todo>
写一段入口：他是谁，你为什么现在加入他，你打算先读什么。
</Todo>
`,
    'life.mdx': `---
thinker: atlas:${slug}
title: 生平
events: []
visibility: private
---

## 分期叙述

<Todo>
按时期分小节写；每个关键节点同时补到 frontmatter 的 events 里，时间线才会出现。
</Todo>
`,
    'afterlife.mdx': `---
thinker: atlas:${slug}
title: 身后
mentions: []
visibility: private
---

## 直接继承

<Todo>待写</Todo>

## 学派化

<Todo>待写</Todo>

## 当代回响

<Todo>待写</Todo>
`,
    'path.mdx': `---
thinker: atlas:${slug}
title: 学习路径
steps:
  - title: 第一步
    read: []
    refs: []
    goal: 待写
    status: 未开始
    checkpoints: []
visibility: private
---

<Todo>写这条路径为什么这样排序。</Todo>
`,
    [`thought/example.mdx`]: `---
id: atlas:${slug}/example
title: 概念名（示例，改或删）
period: ''
definition: 一句话定义（待写）
questions: []
builds_on: []
contrasts_with: []
works: []
evolution: []
interlocutors: []
terms: []
order: 10
visibility: private
---

## 问题

<Todo>这个概念要回答什么问题？先写问题，再写答案。</Todo>

\`\`\`mdx
<Quote prop="§1" source="书名或版本" original="原文" lang="de" translator="你的译本信息">
译文
</Quote>
\`\`\`
`,
    [`works/example.mdx`]: `---
id: atlas:${slug}/example
title: 作品名（示例，改或删）
original: Originaltitel
year: 1900
written: ''
period: ''
editions: []
reading: 我读的译本（待填）
structure: []
theses: []
concepts: []
visibility: private
---

## 结构

<Todo>待写</Todo>
`,
  };

  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(dir, rel);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }

  console.log(`已生成 content/thinkers/${slug}/`);
  console.log('下一步：');
  console.log('  1. 编辑 index.mdx 的姓名、生卒、强调色、分期');
  console.log('  2. npm run dev 预览');
  console.log('  3. 与别人物建立关系：在 content/relations/ 新建 <a>--<b>.mdx');
  console.log('  4. npm run sync 会在 SilverBullet 生成该人物的入口页（atlas/_index/）');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
