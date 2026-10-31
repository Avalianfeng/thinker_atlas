import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';

/**
 * 把 Markdown / 遗留 MDX 正文渲染成 HTML。
 * 遗留组件按 docs/content-format.md v1 §7 降级；v2 正文应为纯 CommonMark/GFM。
 */
export function mdxToHtml(body: string | undefined): string | null {
  if (!body) return null;
  let src = body
    .replace(/^(import|export)\s.*$/gm, '')
    .replace(/<Block\b([^>]*)>([\s\S]*?)<\/Block>/g, (_m, attrs, inner) => {
      const from = /\bfrom="([^"]+)"/.exec(attrs)?.[1] ?? 'own';
      const source = /\bsource="([^"]+)"/.exec(attrs)?.[1];
      const label = `[来源：${from}${source ? `｜${source}` : ''}]`;
      return `\n\n> ${inner.trim().replace(/\n/g, '\n> ')}\n>\n> ${label}\n\n`;
    })
    .replace(/<Quote\b([^>]*)>([\s\S]*?)<\/Quote>/g, (_m, attrs, inner) => {
      const original = /\boriginal="([^"]+)"/.exec(attrs)?.[1];
      const source = /\bsource="([^"]+)"/.exec(attrs)?.[1];
      const prop = /\bprop="([^"]+)"/.exec(attrs)?.[1];
      const head = prop ? `**${prop}** ` : '';
      return `\n\n> ${head}${inner.trim().replace(/\n/g, '\n> ')}${original ? `\n>\n> *${original}*` : ''}${source ? `\n>\n> — ${source}` : ''}\n\n`;
    })
    .replace(/<Note\b([^>]*)>([\s\S]*?)<\/Note>/g, (_m, attrs, inner) => {
      const title = /\btitle="([^"]+)"/.exec(attrs)?.[1];
      return `\n\n> **我的批注${title ? `：${title}` : ''}**\n>\n> ${inner.trim().replace(/\n/g, '\n> ')}\n\n`;
    })
    .replace(/<Sidenote\b[^>]*>([\s\S]*?)<\/Sidenote>/g, (_m, inner) => `（旁注：${inner.trim()}）`)
    .replace(/<Todo\b[^>]*>([\s\S]*?)<\/Todo>/g, (_m, inner) => `*[待写：${inner.trim()}]*`)
    .replace(/<Dialogue\b[^>]*>([\s\S]*?)<\/Dialogue>/g, (_m, inner) => {
      const lines = [...inner.matchAll(/<Say\b[^>]*who="([^"]+)"[^>]*>([\s\S]*?)<\/Say>/g)].map(
        (m) => `**${m[1]}**：${m[2].trim()}`,
      );
      return `\n\n> *（虚构对话）*\n>\n${lines.map((l) => `> ${l}`).join('\n>\n')}\n\n`;
    })
    .replace(/<Say\b[^>]*who="([^"]+)"[^>]*>([\s\S]*?)<\/Say>/g, (_m, who, inner) => `**${who}**：${inner.trim()}`)
    .replace(/<SBNote\b[^>]*page="([^"]+)"[^>]*\/>/g, '（嵌入的 SilverBullet 笔记：`$1`，见 /notes/）')
    .replace(/<Prop\b[^>]*n="([^"]+)"[^>]*\/>/g, '$1')
    .replace(/<[^>]+\/>/g, '')
    .trim();
  try {
    const tree = fromMarkdown(src, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
    return toHtml(toHast(tree, { allowDangerousHtml: false }));
  } catch {
    return null;
  }
}

/** GFM → HTML，并把 ./相对图 改写到 assetBase（如 /people/wittgenstein）。 */
export function mdToHtml(body: string | undefined, opts?: { assetBase?: string }): string | null {
  let html = mdxToHtml(body);
  if (!html) return null;
  const base = opts?.assetBase?.replace(/\/$/, '');
  if (base) {
    html = html.replace(/\bsrc="\.\/([^"]+)"/g, `src="${base}/$1"`);
    html = html.replace(/\bsrc='\./g, (_m) => {
      return `src='${base}/`;
    });
    // markdown 链接里的相对图少见；一并处理 href="./
    html = html.replace(/\bhref="\.\/([^"]+)"/g, (_m, p1) => {
      if (/\.(png|jpe?g|gif|webp|svg)$/i.test(p1)) return `href="${base}/${p1}"`;
      return _m;
    });
  }
  return html;
}
