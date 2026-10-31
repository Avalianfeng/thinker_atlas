import { describe, it, expect } from 'vitest';
import { toHtml } from '../src/lib/markdown';

describe('Markdown 渲染', () => {
  it('普通结构：标题、列表、表格、引用、代码', async () => {
    const html = await toHtml('## 标题\n\n- 一\n- 二\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n> 引用\n\n`code`');
    expect(html).toContain('<h2');
    expect(html).toContain('<li>一</li>');
    expect(html).toContain('<table>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<code>code</code>');
  });

  it('不认识的组件降级成里面的文字，标签不泄漏', async () => {
    const html = await toHtml('<Block from="transcribed" source="某书 5.6">我的语言的界限。</Block>');
    expect(html).not.toContain('<Block');
    expect(html).toContain('我的语言的界限。');
  });

  it('自闭合组件直接消失，不留下痕迹', async () => {
    const html = await toHtml('正文\n\n<SBNote page="notes/x" />\n\n后面');
    expect(html).not.toContain('SBNote');
    expect(html).toContain('正文');
  });

  it('import/export 行被丢掉', async () => {
    const html = await toHtml('import X from "y";\nexport const a = 1;\n\n正文');
    expect(html).not.toContain('import');
    expect(html).toContain('正文');
  });

  it('代码块里的尖括号原样保留', async () => {
    const html = await toHtml('```html\n<div class="x">hi</div>\n```');
    expect(html).toContain('class="x"');
  });

  it('空内容返回空字符串，不抛错', async () => {
    expect(await toHtml('')).toBe('');
    expect(await toHtml(undefined)).toBe('');
  });

  it('奇怪的东西也不炸：没有闭合的标签、花括号、纯符号', async () => {
    await expect(toHtml('<Foo 没闭合\n{奇怪} *** \u0000')).resolves.toBeTypeOf('string');
  });
});
