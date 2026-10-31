#!/usr/bin/env node
// 构建后自检：确认接口文件存在、JSON 可解析、ID 稳定、public 子集不含 private。
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist', 'api');
const required = [
  'v1/index.json',
  'v1/people.json',
  'public/index.json',
  'public/people.json',
];
const errors = [];
for (const f of required) {
  try {
    JSON.parse(await readFile(path.join(root, 'dist/api', f), 'utf8'));
  } catch (e) {
    errors.push(`${f}: ${e.message}`);
  }
}
async function walk(dir, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, acc);
    else if (e.name.endsWith('.json')) acc.push(p);
  }
  return acc;
}
const all = await walk(path.join(root, 'dist', 'api'));
const idRe = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[^/\s]+)?$/;
for (const f of all) {
  let d;
  try {
    d = JSON.parse(await readFile(f, 'utf8'));
  } catch {
    errors.push(`无法解析 ${f}`);
    continue;
  }
  const check = (o) => {
    if (o && typeof o === 'object' && o.id && typeof o.id === 'string' && o.kind === 'person' && !idRe.test(o.id)) {
      errors.push(`${path.relative(dist, f)}: ID 不合规 ${o.id}`);
    }
  };
  if (Array.isArray(d.people)) d.people.forEach(check);
  check(d);
  if (f.includes('/public/') && JSON.stringify(d).includes('"visibility":"private"')) {
    errors.push(`${path.relative(dist, f)}: public 子集里出现 private 条目`);
  }
}
console.log(`API 自检：${all.length} 个 JSON 文件`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('通过。');
