import { describe, it, expect } from 'vitest';
import { mdxToHtml } from '../src/lib/md';

const html = (s) => mdxToHtml(s) ?? '';

describe('MDX → 纯 HTML 降级（给 JSON 接口用）', () => {
  it('Block 变成引用块并标注来源', () => {
    const out = html('<Block from="transcribed" source="TLP 5.6">我的语言的界限。</Block>');
    expect(out).toContain('<blockquote>');
    expect(out).toContain('我的语言的界限。');
    expect(out).toContain('[来源：transcribed｜TLP 5.6]');
  });

  it('Quote 带原文与出处', () => {
    const out = html('<Quote prop="§43" source="PU §43" original="Die Bedeutung...">意义即用法。</Quote>');
    expect(out).toContain('意义即用法。');
    expect(out).toContain('Die Bedeutung...');
    expect(out).toContain('PU §43');
    expect(out).toContain('<strong>§43</strong>');
  });

  it('Note 变成带标题的引用', () => {
    const out = html('<Note title="疑问">这一步太快。</Note>');
    expect(out).toContain('我的批注：疑问');
    expect(out).toContain('这一步太快。');
  });

  it('Sidenote 变行内旁注，Todo 变待写', () => {
    expect(html('<Sidenote>补充说明</Sidenote>')).toContain('（旁注：补充说明）');
    expect(html('<Todo>还没写</Todo>')).toContain('[待写：还没写]');
  });

  it('Dialogue 变虚构对话，保留发言人', () => {
    const out = html('<Dialogue title="x"><Say who="甲">问题？</Say><Say who="乙">回答。</Say></Dialogue>');
    expect(out).toContain('虚构对话');
    expect(out).toContain('**甲**'.replace(/\*/g, '') ? '甲' : '甲');
    expect(out).toContain('问题？');
    expect(out).toContain('回答。');
  });

  it('删掉 import 行，不把 JSX 漏进 HTML', () => {
    const out = html('import X from "y";\n\n正文 <Prop n="5.6" /> 之后');
    expect(out).not.toContain('import');
    expect(out).not.toContain('<Prop');
    expect(out).toContain('5.6');
  });

  it('保留标题、列表、表格等基本 Markdown 结构', () => {
    const out = html('## 标题\n\n- 一\n- 二\n\n| a | b |\n| --- | --- |\n| 1 | 2 |');
    expect(out).toContain('<h2>标题</h2>');
    expect(out).toContain('<li>一</li>');
    expect(out).toContain('<table>');
  });

  it('空正文返回 null', () => {
    expect(mdxToHtml(undefined)).toBeNull();
  });
});
