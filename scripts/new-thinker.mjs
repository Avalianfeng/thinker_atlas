#!/usr/bin/env node
/**
 * npm run new <id> —— 生成一位新人物的 content/people/<id>/ 骨架（v2）。
 * 不会覆盖已有文件；id = 夹名。
 */
import path from 'node:path';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2];

if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
  console.error('用法：npm run new <id>（小写字母、数字、连字符，例如 feyerabend）');
  process.exit(1);
}

const dir = path.join(root, 'content', 'people', id);

async function main() {
  try {
    await readFile(path.join(dir, 'index.md'));
    console.error(`content/people/${id}/ 已存在，未改动。`);
    process.exit(1);
  } catch {
    /* 不存在，继续 */
  }

  let order = 1;
  try {
    order =
      (await readdir(path.join(root, 'content', 'people'), { withFileTypes: true })).filter((e) => e.isDirectory())
        .length + 1;
  } catch {
    /* empty */
  }

  await mkdir(dir, { recursive: true });

  const index = `---
id: ${id}
name: （中文名）
name_en: （English name）
born: "1900-01-01"
# died: "1990-01-01"
order: ${order}
intro: 一句话导语。
portrait: ./portrait.jpg
visibility: private
---

人物总述（可空）。上传真图为同目录 portrait.jpg。
`;

  const piece = `---
title: （篇名）
kind: note
---

正文：CommonMark / GFM。图片用相对路径 \`![说明](./xxx.png)\`。
`;

  await writeFile(path.join(dir, 'index.md'), index);
  await writeFile(path.join(dir, '01-导读.md'), piece);
  console.log(`已创建 content/people/${id}/（index.md + 01-导读.md）。请补真图 portrait.jpg。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
