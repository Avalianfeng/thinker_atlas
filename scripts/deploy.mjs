#!/usr/bin/env node
/**
 * npm run deploy —— rsync 到 VPS。所有连接信息来自 .env，不写死在脚本里。
 *
 * 必需：
 *   DEPLOY_HOST      例如 vps.example.com
 *   DEPLOY_USER      例如 atlas
 *   DEPLOY_PATH      例如 /var/www/atlas
 * 可选：
 *   DEPLOY_PORT      默认 22
 *   DEPLOY_SSH_KEY   ssh 私钥路径
 *   DEPLOY_DRY_RUN   1 时只演练
 *
 * 只同步 dist/（--delete 只作用于目标目录里的旧构建产物），不碰 Caddy 配置与其他文件。
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const { DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH, DEPLOY_PORT, DEPLOY_SSH_KEY } = process.env;
const dryRun = process.env.DEPLOY_DRY_RUN === '1' || process.argv.includes('--dry-run');

function fail(msg) {
  console.error(`部署中止：${msg}`);
  console.error('请在 .env 里配置 DEPLOY_HOST / DEPLOY_USER / DEPLOY_PATH（见 .env.example）。');
  process.exit(1);
}

if (!existsSync(path.join(dist, 'index.html'))) fail('dist/ 里没有构建产物，先运行 npm run build');
if (!DEPLOY_HOST) fail('缺少 DEPLOY_HOST');
if (!DEPLOY_USER) fail('缺少 DEPLOY_USER');
if (!DEPLOY_PATH) fail('缺少 DEPLOY_PATH');

const ssh = ['ssh'];
if (DEPLOY_PORT) ssh.push('-p', DEPLOY_PORT);
if (DEPLOY_SSH_KEY) ssh.push('-i', DEPLOY_SSH_KEY);

const args = [
  '-az',
  '--delete',
  '--delete-excluded',
  '--exclude',
  '.well-known/',
  '-e',
  ssh.join(' '),
  `${dist}/`,
  `${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/`,
];
if (dryRun) args.splice(1, 0, '--dry-run', '-v');

console.log(`rsync ${dist}/ → ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/${dryRun ? '（演练）' : ''}`);
const r = spawnSync('rsync', args, { stdio: 'inherit' });
if (r.error) fail(`无法运行 rsync：${r.error.message}`);
if (r.status !== 0) fail(`rsync 退出码 ${r.status}`);
console.log('完成。若 Caddy 有缓存策略，记得按需 reload。');
