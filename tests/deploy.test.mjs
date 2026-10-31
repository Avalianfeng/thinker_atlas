import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'deploy.mjs');

let dir;
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

/** 建一个假的 dist 与假的 rsync（只是把参数回显），用来验证部署脚本的开关逻辑。 */
async function setup() {
  dir = await mkdtemp(path.join(tmpdir(), 'atlas-deploy-'));
  await mkdir(path.join(dir, 'dist'), { recursive: true });
  await writeFile(path.join(dir, 'dist', 'index.html'), '<html></html>');
  await mkdir(path.join(dir, 'bin'), { recursive: true });
  await writeFile(path.join(dir, 'bin', 'rsync'), '#!/bin/sh\necho "$@" > "$(dirname "$0")/args.txt"\n');
  const { chmod } = await import('node:fs/promises');
  await chmod(path.join(dir, 'bin', 'rsync'), 0o755);
  return dir;
}

const run = (env) =>
  spawnSync(process.execPath, [script], {
    env: { ...process.env, DEPLOY_DIST: path.join(dir ?? '', 'dist'), ...env, PATH: `${path.join(dir ?? '', 'bin')}:${process.env.PATH}` },
    cwd: path.dirname(script),
    encoding: 'utf8',
  });

describe('deploy 脚本', () => {
  it('缺环境变量时以配置错误退出，并提示去看 .env.example', async () => {
    await setup();
    const r = run({ DEPLOY_HOST: '', DEPLOY_USER: '', DEPLOY_PATH: '' });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('.env.example');
  });

  it('按环境变量拼 rsync 参数，不写死主机', async () => {
    await setup();
    const r = run({ DEPLOY_HOST: 'vps.test', DEPLOY_USER: 'atlas', DEPLOY_PATH: '/srv/www', DEPLOY_PORT: '2200' });
    expect(r.status).toBe(0);
    const args = await readFile(path.join(dir, 'bin', 'args.txt'), 'utf8');
    expect(args).toContain('-az');
    expect(args).toContain('--delete');
    expect(args).toContain('-p 2200');
    expect(args).toContain('atlas@vps.test:/srv/www/');
  });

  it('DEPLOY_DRY_RUN=1 时只演练', async () => {
    await setup();
    const r = run({ DEPLOY_HOST: 'h', DEPLOY_USER: 'u', DEPLOY_PATH: '/d', DEPLOY_DRY_RUN: '1' });
    expect(r.status).toBe(0);
    const args = await readFile(path.join(dir, 'bin', 'args.txt'), 'utf8');
    expect(args).toContain('--dry-run');
  });

  it('没有构建产物时拒绝部署', async () => {
    await setup();
    await rm(path.join(dir, 'dist', 'index.html'));
    const r = run({ DEPLOY_HOST: 'h', DEPLOY_USER: 'u', DEPLOY_PATH: '/d' });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('npm run build');
  });
});
