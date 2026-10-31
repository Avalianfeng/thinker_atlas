import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * 本地文件夹适配器：用于离线开发与测试。
 * 直接读一个目录，行为与 SilverBullet 适配器一致。
 * @param {string} rootDir
 * @returns {import('./notes.mjs').SourceAdapter}
 */
export function localFolderAdapter(rootDir) {
  const abs = (page) => path.join(rootDir, page);

  return {
    name: 'local-folder',
    async list(dir) {
      const out = [];
      const walk = async (rel) => {
        let entries;
        try {
          entries = await readdir(abs(rel), { withFileTypes: true });
        } catch {
          return;
        }
        for (const e of entries) {
          const child = path.posix.join(rel, e.name);
          if (e.isDirectory()) await walk(child);
          else if (e.name.endsWith('.md')) {
            const file = await this.read(child);
            if (file) out.push(file);
          }
        }
      };
      await walk(dir);
      return out;
    },
    async read(page) {
      try {
        const content = await readFile(abs(page), 'utf8');
        return { page, content };
      } catch {
        return null;
      }
    },
    async write(page, content) {
      await mkdir(path.dirname(abs(page)), { recursive: true });
      await writeFile(abs(page), content, 'utf8');
    },
    async ping() {
      try {
        await readdir(rootDir);
        return true;
      } catch {
        return false;
      }
    },
  };
}
