import { describe, it, expect } from 'vitest';
import { pangu, needsGap } from '../src/lib/cjk.mjs';
import { provenanceStats, extractNotes, addStats } from '../src/lib/provenance';
import { yearOf, parseId, normalizeRef, lifespan } from '../src/lib/ids';

describe('中西文间距', () => {
  it('在汉字与西文之间插入空格', () => {
    expect(pangu('读Wittgenstein的书')).toBe('读 Wittgenstein 的书');
    expect(pangu('1911年')).toBe('1911 年');
    expect(pangu('见《逻辑哲学论》5.6 节')).toBe('见《逻辑哲学论》5.6 节');
  });
  it('不动已有的空格与纯西文', () => {
    expect(pangu('already 好了 ok')).toBe('already 好了 ok');
    expect(pangu('Tractatus Logico-Philosophicus')).toBe('Tractatus Logico-Philosophicus');
  });
  it('跨节点边界判断是否需要补空', () => {
    expect(needsGap('的', 'W')).toBe(true);
    expect(needsGap('W', '的')).toBe(true);
    expect(needsGap('的', '。')).toBe(false);
    expect(needsGap('', 'W')).toBe(false);
  });
});

describe('来源统计', () => {
  it('未标注正文计为 own，Block 按 from 分桶', () => {
    const body = `正文一段。

<Block from="transcribed" source="TLP 5.6">我的语言的界限。</Block>

<Block from="secondary" source="Monk 1990">研究者的说法。</Block>
`;
    const s = provenanceStats(body);
    expect(s.own).toBeGreaterThan(0);
    expect(s.original).toBe(7);
    expect(s.secondary).toBe(6);
    expect(s.total).toBe(s.own + s.original + s.secondary + s.ai);
  });

  it('quote 默认计入原典，ai-excerpt 单独计数', () => {
    const s = provenanceStats('<Quote source="x">引文内容</Quote>\n\n<Block from="ai-excerpt">模型的说法</Block>');
    expect(s.original).toBe(4);
    expect(s.ai).toBe(5);
  });

  it('Todo 只计数不计字，也不算进任何来源', () => {
    const s = provenanceStats('<Todo>待写很长很长的一段</Todo>');
    expect(s.todo).toBe(1);
    expect(s.total).toBe(0);
  });

  it('忽略代码块、标题与 import', () => {
    const body = '## 标题\n\nimport X from "y";\n\n```js\nconst a = 1;\n```\n\n正文';
    expect(provenanceStats(body).own).toBe(2);
  });

  it('addStats 合并', () => {
    const a = provenanceStats('一二三');
    const b = provenanceStats('四五六');
    expect(addStats(a, b).own).toBe(6);
  });
});

describe('批注提取', () => {
  it('取出 Note 的标题与正文', () => {
    const notes = extractNotes('<Note title="标题">内容一</Note>\n\n<Note>内容二</Note>');
    expect(notes).toHaveLength(2);
    expect(notes[0]).toEqual({ id: undefined, title: '标题', text: '内容一' });
    expect(notes[1].title).toBeUndefined();
  });
  it('没有批注时返回空数组', () => {
    expect(extractNotes(undefined)).toEqual([]);
    expect(extractNotes('正文')).toEqual([]);
  });
});

describe('ID 与年代', () => {
  it('解析 atlas 稳定 ID', () => {
    expect(parseId('atlas:wittgenstein')).toEqual({ thinker: 'wittgenstein', item: undefined });
    expect(parseId('atlas:wittgenstein/language-games')).toEqual({ thinker: 'wittgenstein', item: 'language-games' });
  });
  it('接受 SilverBullet 里的简写', () => {
    expect(normalizeRef('wittgenstein/language-games')).toBe('atlas:wittgenstein/language-games');
    expect(normalizeRef('#atlas/jung')).toBe('atlas:jung');
    expect(normalizeRef('atlas:feyerabend')).toBe('atlas:feyerabend');
  });
  it('从各种日期格式取年份', () => {
    expect(yearOf('1889-04-26')).toBe(1889);
    expect(yearOf('1921')).toBe(1921);
    expect(yearOf(1953)).toBe(1953);
    expect(yearOf(undefined)).toBeUndefined();
  });
  it('生卒年用破折号', () => {
    const t = { data: { born: { date: '1889-04-26' }, died: { date: '1951-04-29' } } };
    expect(lifespan(t)).toBe('1889—1951');
  });
});
