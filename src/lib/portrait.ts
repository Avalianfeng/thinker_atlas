import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const;

/**
 * 解析人物肖像 URL。
 * 优先 frontmatter `portrait`（`./portrait.jpg` 或 `/portraits/<id>.jpg`）；
 * 否则探测 `public/portraits/<id>.*`。
 * 无图时返回 undefined，由 Portrait.astro 回退字母 SVG 占位。
 */
export function resolvePortrait(slug: string, portrait?: string | null): string | undefined {
  if (portrait && portrait.trim()) {
    const p = portrait.trim();
    if (p.startsWith('/') || /^https?:\/\//i.test(p)) return p;
    // 相对：./portrait.jpg → /portraits/<slug>.<ext>（由 sync-portraits 复制）
    const base = path.posix.basename(p.replace(/\\/g, '/'));
    const ext = path.posix.extname(base).toLowerCase() || '.jpg';
    const name = EXTS.includes(ext as (typeof EXTS)[number]) ? `${slug}${ext}` : `${slug}.jpg`;
    return `/portraits/${name}`;
  }
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

/** 从人物 id（或遗留 atlas:wittgenstein）取出 slug。 */
export function thinkerSlug(id: string): string {
  return id.replace(/^atlas:/, '').split('/')[0]!;
}

export const personSlug = thinkerSlug;
