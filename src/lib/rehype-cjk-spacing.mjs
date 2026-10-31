import { pangu, needsGap } from './cjk.mjs';

const SKIP = new Set(['code', 'pre', 'script', 'style', 'kbd', 'samp']);

/**
 * rehype 插件：在中文与西文/数字之间留空，含跨行内元素边界的情况。
 * 跳过代码与带 data-no-space 的元素。
 */
export default function rehypeCjkSpacing() {
  return (tree) => {
    let last = '';
    const walk = (node, skip) => {
      if (node.type === 'text') {
        if (skip) {
          last = '';
          return;
        }
        let value = pangu(node.value);
        if (value && needsGap(last, value[0])) value = ' ' + value;
        node.value = value;
        if (value) last = value[value.length - 1];
        return;
      }
      if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        last = '';
      }
      const childSkip =
        skip ||
        (node.type === 'element' &&
          (SKIP.has(node.tagName) || (node.properties && node.properties.dataNoSpace !== undefined)));
      if (node.type === 'element' && ['p', 'li', 'h1', 'h2', 'h3', 'h4', 'td', 'th', 'blockquote', 'div'].includes(node.tagName)) {
        last = '';
      }
      if (node.children) for (const child of node.children) walk(child, childSkip);
    };
    walk(tree, false);
  };
}
