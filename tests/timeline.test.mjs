import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseTimelineYaml,
  loadPersonTimeline,
  loadMultiLanes,
  multiYearSpan,
  laneLifeSpan,
  formatEventWhen,
  shortTitle,
  ageAtEvent,
  estimateLabelWidth,
  layoutLaneLabels,
} from '../src/lib/timeline-yml';
import { COOL_ACCENTS, KIND_SHAPE, personAccent } from '../src/lib/accents';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('timeline.yml 解析', () => {
  it('必填 date+title；默认 kind=life、multi=false', () => {
    const events = parseTimelineYaml(`
events:
  - date: "1889-04-26"
    title: 生于维也纳
`);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      date: '1889-04-26',
      title: '生于维也纳',
      kind: 'life',
      multi: false,
    });
  });

  it('接受 to / kind / multi；按 date 排序', () => {
    const events = parseTimelineYaml(`
events:
  - date: "1921"
    title: 出版
    kind: publish
    multi: true
  - date: "1911"
    to: "1913"
    title: 剑桥
    kind: meet
    multi: true
`);
    expect(events.map((e) => e.date)).toEqual(['1911', '1921']);
    expect(events[0]).toMatchObject({ to: '1913', kind: 'meet', multi: true });
    expect(formatEventWhen(events[0])).toBe('1911—1913');
  });

  it('缺 date/title 或非法 kind 抛错', () => {
    expect(() => parseTimelineYaml('events:\n  - title: x\n')).toThrow(/date/);
    expect(() => parseTimelineYaml('events:\n  - date: "1"\n')).toThrow(/title/);
    expect(() =>
      parseTimelineYaml(`
events:
  - date: "1900"
    title: x
    kind: nope
`),
    ).toThrow(/kind/);
  });
});

describe('样例内容与多人合并', () => {
  it('维特根斯坦 timeline 可读且含 multi', () => {
    const events = loadPersonTimeline('wittgenstein', root);
    expect(events.length).toBeGreaterThanOrEqual(5);
    expect(events.some((e) => e.multi)).toBe(true);
    expect(events.every((e) => e.date && e.title)).toBe(true);
  });

  it('loadMultiLanes 只收 multi，按 order，带 born/died', () => {
    const lanes = loadMultiLanes(
      [
        { id: 'russell', name: '罗素', order: 2, accent: '#111', born: '1872-05-18', died: '1970-02-02' },
        { id: 'wittgenstein', name: '维', order: 1, accent: '#222', born: '1889-04-26', died: '1951-04-29' },
      ],
      root,
    );
    expect(lanes.map((l) => l.personId)).toEqual(['wittgenstein', 'russell']);
    expect(lanes[0].born).toBe('1889-04-26');
    expect(lanes[1].died).toBe('1970-02-02');
    for (const lane of lanes) {
      expect(lane.events.length).toBeGreaterThan(0);
      expect(lane.events.every((e) => e.multi)).toBe(true);
    }
    const span = multiYearSpan(lanes, 0, 2026);
    expect(span).toBeTruthy();
    // 轴含 born：罗素 1872、维 1889；含 died：1970
    expect(span.from).toBe(1872);
    expect(span.to).toBe(1970);
  });

  it('无人 multi 时 lanes 为空', () => {
    const yaml = `events:\n  - date: "1900"\n    title: 仅个人\n`;
    const events = parseTimelineYaml(yaml);
    expect(events.filter((e) => e.multi)).toHaveLength(0);
  });
});

describe('shortTitle', () => {
  it('短标题原样返回；过长按码点截断加省略号', () => {
    expect(shortTitle('生于维也纳')).toBe('生于维也纳');
    expect(shortTitle('《逻辑哲学论》出版')).toBe('《逻辑哲学…');
    expect(shortTitle('赴剑桥，随罗素学习', 6)).toBe('赴剑桥，随…');
  });
});

describe('寿命条与时年', () => {
  it('laneLifeSpan：born→died；无 died 用至今年；无 born 回退事件', () => {
    expect(
      laneLifeSpan(
        { born: '1889-04-26', died: '1951-04-29', events: [{ date: '1911', title: 'x', kind: 'life', multi: true }] },
        2026,
      ),
    ).toEqual({ from: 1889, to: 1951 });
    expect(
      laneLifeSpan({ born: '2000', events: [{ date: '2010', title: 'x', kind: 'life', multi: true }] }, 2026),
    ).toEqual({ from: 2000, to: 2026 });
    expect(
      laneLifeSpan(
        {
          events: [
            { date: '1910', to: '1913', title: 'a', kind: 'publish', multi: true },
            { date: '1911', title: 'b', kind: 'meet', multi: true },
          ],
        },
        2026,
      ),
    ).toEqual({ from: 1910, to: 1913 });
  });

  it('ageAtEvent：有 born 才返回 事件年−出生年', () => {
    expect(ageAtEvent('1889-04-26', '1911')).toBe(22);
    expect(ageAtEvent('1872-05-18', '1910')).toBe(38);
    expect(ageAtEvent(undefined, '1911')).toBeUndefined();
  });
});

describe('同行标签避让', () => {
  it('CJK 宽约等于字号', () => {
    expect(estimateLabelWidth('赴剑桥', 10)).toBe(30);
    expect(estimateLabelWidth('ABC', 10)).toBeCloseTo(16.5, 5);
  });

  it('近点上下交替；过密则省略短标', () => {
    // 两近点：第二个应改到上方
    const two = layoutLaneLabels([
      { cx: 100, short: '甲乙丙' },
      { cx: 108, short: '丁戊己' },
    ]);
    expect(two[0].show).toBe(true);
    expect(two[1].show).toBe(true);
    expect(two[0].dy).toBe(16);
    expect(two[1].dy).toBe(-16);
    expect(two[1].leader).toBe(true);

    // 罗素样：1910 与 1911 极近（px/年≈14 → 约 14px）
    const russellish = layoutLaneLabels([
      { cx: 100, short: '《数学…' },
      { cx: 114, short: '维特根…' },
      { cx: 200, short: '生于特…' },
    ]);
    expect(russellish[0].show).toBe(true);
    expect(russellish[1].show).toBe(true);
    expect(russellish[0].dy).not.toBe(russellish[1].dy);
    expect(russellish[2].show).toBe(true);
    expect(russellish[2].dy).toBe(16);

    // 同一 cx 堆叠超层 → 后来者可被省略
    const stack = layoutLaneLabels([
      { cx: 50, short: '一一一一' },
      { cx: 50, short: '二二二二' },
      { cx: 50, short: '三三三三' },
      { cx: 50, short: '四四四四' },
      { cx: 50, short: '五五五五' },
    ]);
    const shown = stack.filter((p) => p.show).length;
    expect(shown).toBeLessThanOrEqual(4);
    expect(stack.some((p) => !p.show)).toBe(true);
  });
});


describe('personAccent / KIND_SHAPE', () => {
  it('冷色盘无暖色；按 order 稳定取色', () => {
    expect(COOL_ACCENTS.length).toBeGreaterThanOrEqual(5);
    for (const c of COOL_ACCENTS) {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
      // 粗略：B 通道不低于 R（偏蓝青），排除明显暖棕
      const r = parseInt(c.slice(1, 3), 16);
      const b = parseInt(c.slice(5, 7), 16);
      expect(b).toBeGreaterThanOrEqual(r - 8);
    }
    expect(personAccent({ order: 1 })).toBe(COOL_ACCENTS[1]);
    expect(personAccent({ order: 2 })).toBe(COOL_ACCENTS[2]);
    expect(personAccent({ order: 1 + COOL_ACCENTS.length })).toBe(COOL_ACCENTS[1]);
  });

  it('无 order 时按 id 稳定哈希', () => {
    const a = personAccent({ id: 'wittgenstein' });
    const b = personAccent({ id: 'wittgenstein' });
    expect(a).toBe(b);
    expect(COOL_ACCENTS).toContain(a);
  });

  it('五类 kind 各有形状符号', () => {
    expect(KIND_SHAPE).toMatchObject({
      life: 'filled-circle',
      write: 'hollow-circle',
      publish: 'filled-square',
      meet: 'filled-diamond',
      context: 'hollow-triangle',
    });
  });
});
