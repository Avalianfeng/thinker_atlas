import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';

/**
 * 把 MDX 正文渲染成不含私有组件的 HTML，供 JSON 接口使用。
 * 组件的降级写法见 docs/content-format.md §7：任何工具都能读，不依赖 Astro。
 */
export function mdxToHtml(body: string | undefined): string | null {
  if (!body) return null;
  let src = body
    // 去掉 import/export 行
    .replace(/^(import|export)\s.*$/gm, '')
    // <Block from="x" source="y">正文</Block> → 引用块 + 来源行
    .replace(/<Block\b([^>]*)>([\s\S]*?)<\/Block>/g, (_m, attrs, inner) => {
      const from = /\bfrom="([^"]+)"/.exec(attrs)?.[1] ?? 'own';
      const source = /\bsource="([^"]+)"/.exec(attrs)?.[1];
      const label = `[来源：${from}${source ? `｜${source}` : ''}]`;
      return `\n\n> ${inner.trim().replace(/\n/g, '\n> ')}\n>\n> ${label}\n\n`;
    })
    // <Quote original=".." source="..">译文</Quote>
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
