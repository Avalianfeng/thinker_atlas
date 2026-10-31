import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'sync.mjs');

describe('npm run sync CLI（独立 Atlas）', () => {
  it('默认禁用：退出 0，并说明真源是 git content/', () => {
    const r = spawnSync(process.execPath, [script], { encoding: 'utf8', cwd: root });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/默认已禁用/);
    expect(r.stdout).toMatch(/git content/);
    expect(r.stdout).not.toMatch(/引用：/);
  });

  it('未 --enable 时即使有 --local 也不跑适配器', () => {
    const r = spawnSync(process.execPath, [script, '--local', 'demo/notes'], { encoding: 'utf8', cwd: root });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/默认已禁用/);
  });
});
