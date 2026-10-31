import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const;

/**
 * 解析人物肖像 URL。
 * 优先 frontmatter `portrait`（建议 `/portraits/<slug>.jpg`）；
 * 否则探测 `public/portraits/<slug>.*`。
 * 无图时返回 undefined，由 Portrait.astro 回退字母 SVG 占位。
 */
export function resolvePortrait(slug: string, portrait?: string | null): string | undefined {
  if (portrait && portrait.trim()) {
    const p = portrait.trim();
    if (p.startsWith('/') || /^https?:\/\//i.test(p)) return p;
    // 相对名：portrait.jpg → /portraits/portrait.jpg；或 basename
    const base = path.posix.basename(p.replace(/\\/g, '/'));
    return `/portraits/${base.includes('.') ? base : `${slug}.jpg`}`;
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

/** 从 atlas:wittgenstein 取出 slug。 */
export function thinkerSlug(id: string): string {
  return id.replace(/^atlas:/, '').split('/')[0]!;
}
