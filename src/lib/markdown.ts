/**
 * Markdown → HTML。只做这一件事：普通 Markdown（含 GFM 表格、任务列表）。
 * 读到不认识的东西就当普通文字，绝不抛错、绝不让构建失败。
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify);

/**
 * 去掉「长得像组件」的语法，留下里面的字。代码块与行内代码不动。
 * 只处理大写开头、不像 HTML 的标签（本机没有 MDX，正常 Markdown 不会用到）。
 */
function readable(md: string): string {
  const held: string[] = [];
  const hold = (s: string) => {
    held.push(s);
    return `\u0000${held.length - 1}\u0000`;
  };

  let text = String(md ?? '')
    .replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, hold)
    .replace(/`[^`\n]+`/g, hold);

  text = text
    .replace(/^[ \t]*(import|export)\b[^\n]*$/gm, '')
    .replace(/<([A-Z][\w.]*)(?:\s[^<>]*?)?>([\s\S]*?)<\/\1>/g, (_m, _tag, inner) => hold(inner.trim()))
    .replace(/<[A-Z][\w.]*(?:\s[^<>]*?)?\/?>/g, '');

  return text.replace(/\u0000(\d+)\u0000/g, (_m, i) => held[Number(i)] ?? '');
}

export async function toHtml(md: string | undefined): Promise<string> {
  try {
    return String(await processor.process(readable(md ?? '')));
  } catch {
    // 连 Markdown 都解析不了：把原文当纯文本段落输出
    const text = String(md ?? '').trim();
    return text ? `<p>${escapeHtml(text).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</p>` : '';
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 图片改成绝对路径：md 里写 ![](照片.jpg) 或 ![](./照片.jpg) 都能显示，
 * 因为页面的 base 是 /people/<folder>/，图片实际在 /atlas/<folder>/。
 */
export function resolveImages(html: string, base: string) {
  return html.replace(/(<img\b[^>]*?\bsrc=")([^"]+)(")/g, (m, before, src: string, after) => {
    if (/^(https?:|\/\/|\/|data:)/i.test(src)) return m;
    // 渲染器可能已经编码过，先还原再编码，避免 %25 套两层
    let clean = src.replace(/^\.\//, '');
    try {
      clean = decodeURI(clean);
    } catch {
      /* 不是合法编码就按原样 */
    }
    return `${before}${base}/${clean.split('/').map(encodeURIComponent).join('/')}${after}`;
  });
}
