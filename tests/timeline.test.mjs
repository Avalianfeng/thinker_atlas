import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseTimelineYaml,
  loadPersonTimeline,
  loadMultiLanes,
  multiYearSpan,
  formatEventWhen,
} from '../src/lib/timeline-yml';

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

  it('loadMultiLanes 只收 multi，按 order', () => {
    const lanes = loadMultiLanes(
      [
        { id: 'russell', name: '罗素', order: 2, accent: '#111' },
        { id: 'wittgenstein', name: '维', order: 1, accent: '#222' },
      ],
      root,
    );
    expect(lanes.map((l) => l.personId)).toEqual(['wittgenstein', 'russell']);
    for (const lane of lanes) {
      expect(lane.events.length).toBeGreaterThan(0);
      expect(lane.events.every((e) => e.multi)).toBe(true);
    }
    const span = multiYearSpan(lanes);
    expect(span).toBeTruthy();
    expect(span.from).toBeLessThan(span.to);
  });

  it('无人 multi 时 lanes 为空', () => {
    const yaml = `events:\n  - date: "1900"\n    title: 仅个人\n`;
    const events = parseTimelineYaml(yaml);
    expect(events.filter((e) => e.multi)).toHaveLength(0);
  });
});
