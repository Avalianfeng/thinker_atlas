import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const;

function publicPortraitPath(name: string): string {
  return path.join(process.cwd(), 'public', 'portraits', name);
}

function contentPersonDir(slug: string): string {
  return path.join(process.cwd(), 'content', 'people', slug);
}

/** public/portraits/<slug>.* 是否存在；返回 URL。 */
function probePublic(slug: string): string | undefined {
  const dir = path.join(process.cwd(), 'public', 'portraits');
  if (!existsSync(dir)) return undefined;
  try {
    const files = readdirSync(dir);
    for (const ext of EXTS) {
      const name = `${slug}${ext}`;
      if (files.includes(name)) return `/portraits/${name}`;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/** content/people/<slug>/ 下是否有 portrait|photo|照片.* */
function probeContentPortrait(slug: string): string | undefined {
  const dir = contentPersonDir(slug);
  if (!existsSync(dir)) return undefined;
  try {
    const files = readdirSync(dir);
    const bases = new Set(['portrait', 'photo', '照片']);
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (!(EXTS as readonly string[]).includes(ext)) continue;
      const base = path.basename(f, ext);
      if (bases.has(base)) return `/portraits/${slug}${ext}`;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * 解析人物肖像 URL。
 * 优先 frontmatter `portrait`（`./portrait.jpg` 或 `/portraits/<id>.jpg`）；
 * 相对路径时：public 已同步或 content 源文件存在才返回 URL（避免 SSR 指向 404，
 * 页面落到字母占位）。否则探测 `public/portraits/<id>.*` / content 源。
 * 无图时返回 undefined，由 Portrait.astro / salon-fallback 回退字母占位。
 */
export function resolvePortrait(slug: string, portrait?: string | null): string | undefined {
  if (portrait && portrait.trim()) {
    const p = portrait.trim();
    if (/^https?:\/\//i.test(p)) return p;
    if (p.startsWith('/')) {
      if (p.startsWith('/portraits/')) {
        const name = path.posix.basename(p);
        if (existsSync(publicPortraitPath(name))) return p;
        // public 尚未 sync：若 content 有源图仍返回约定 URL（predev/prebuild 会补）
        const fromContent = probeContentPortrait(slug);
        if (fromContent) return fromContent;
        return probePublic(slug);
      }
      return p;
    }
    // 相对：./portrait.jpg → /portraits/<slug>.<ext>（由 sync-portraits 复制）
    const base = path.posix.basename(p.replace(/\\/g, '/'));
    const ext = path.posix.extname(base).toLowerCase() || '.jpg';
    const name = (EXTS as readonly string[]).includes(ext) ? `${slug}${ext}` : `${slug}.jpg`;
    const publicFile = publicPortraitPath(name);
    const contentFile = path.join(contentPersonDir(slug), base);
    if (existsSync(publicFile) || existsSync(contentFile)) {
      return `/portraits/${name}`;
    }
    // Windows 大小写 / 别名：再扫 content 与 public
    return probeContentPortrait(slug) ?? probePublic(slug);
  }
  return probePublic(slug) ?? probeContentPortrait(slug);
}

/** 从人物 id（或遗留 atlas:wittgenstein）取出 slug。 */
export function thinkerSlug(id: string): string {
  return id.replace(/^atlas:/, '').split('/')[0]!;
}

export const personSlug = thinkerSlug;
