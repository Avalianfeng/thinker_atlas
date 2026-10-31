import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

let logCache: Map<string, string> | null = null;
let recentCache: { date: string; files: string[]; subject: string }[] | null = null;

function readLog() {
  if (logCache) return;
  logCache = new Map();
  recentCache = [];
  try {
    const out = execFileSync('git', ['log', '--format=@@%cI\t%s', '--name-only', '--', 'content'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    let current: { date: string; files: string[]; subject: string } | null = null;
    for (const line of out.split('\n')) {
      if (line.startsWith('@@')) {
        const [date, subject] = line.slice(2).split('\t');
        current = { date, subject, files: [] };
        recentCache.push(current);
      } else if (line.trim() && current) {
        current.files.push(line.trim());
        if (!logCache.has(line.trim())) logCache.set(line.trim(), current.date);
      }
    }
  } catch {
    /* 没有 git 时退回文件修改时间 */
  }
}

/** 文件最后修改时间：取自 git，未提交的文件取文件系统时间。 */
export function lastModified(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined;
  readLog();
  const fromGit = logCache!.get(filePath);
  if (fromGit) return fromGit;
  try {
    return statSync(filePath).mtime.toISOString();
  } catch {
    return undefined;
  }
}

export function recentCommits(limit = 20) {
  readLog();
  return recentCache!.slice(0, limit);
}

export function formatDay(iso: string | undefined) {
  if (!iso) return '';
  return iso.slice(0, 10);
}
