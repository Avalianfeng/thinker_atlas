/**
 * 读 people/<id>/timeline.yml：个人事件真源；多人视图只合并 multi:true。
 * 不经 Content Collections（yml 旁挂人物夹）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';
import { yearOf } from './ids';

export const TIMELINE_KINDS = ['life', 'write', 'publish', 'meet', 'context'] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export interface TimelineEvent {
  date: string;
  title: string;
  to?: string;
  kind: TimelineKind;
  multi: boolean;
}

export interface TimelineLane {
  personId: string;
  name: string;
  order: number;
  accent: string;
  events: TimelineEvent[];
}

export const KIND_LABEL: Record<TimelineKind, string> = {
  life: '生平',
  write: '写作',
  publish: '出版',
  meet: '交往',
  context: '背景',
};

const KIND_SET = new Set<string>(TIMELINE_KINDS);

function asDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? '').trim();
}

/** 解析 YAML 正文为事件列表；非法项抛错。 */
export function parseTimelineYaml(raw: string, label = 'timeline.yml'): TimelineEvent[] {
  const doc = loadYaml(raw);
  if (doc == null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error(`${label}: 根须为对象，含 events`);
  }
  const eventsRaw = (doc as { events?: unknown }).events;
  if (!Array.isArray(eventsRaw)) throw new Error(`${label}: 缺 events 数组`);

  const out: TimelineEvent[] = [];
  for (let i = 0; i < eventsRaw.length; i++) {
    const row = eventsRaw[i];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`${label}: events[${i}] 须为对象`);
    }
    const r = row as Record<string, unknown>;
    const date = asDateStr(r.date);
    const title = String(r.title ?? '').trim();
    if (!date || !title) throw new Error(`${label}: events[${i}] 需要 date 与 title`);
    if (yearOf(date) === undefined) throw new Error(`${label}: events[${i}] date 无法解析年份：${date}`);

    let kind: TimelineKind = 'life';
    if (r.kind !== undefined && r.kind !== null && String(r.kind).trim() !== '') {
      const k = String(r.kind).trim();
      if (!KIND_SET.has(k)) throw new Error(`${label}: events[${i}] kind 非法：${k}`);
      kind = k as TimelineKind;
    }

    const to = r.to !== undefined && r.to !== null && String(r.to).trim() !== '' ? asDateStr(r.to) : undefined;
    if (to && yearOf(to) === undefined) throw new Error(`${label}: events[${i}] to 无法解析年份：${to}`);

    const multi = Boolean(r.multi);
    out.push({ date, title, to, kind, multi });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function timelinePath(personId: string, root = process.cwd()) {
  return path.join(root, 'content', 'people', personId, 'timeline.yml');
}

/** 无文件 → 空数组；有文件则解析（坏文件抛错）。 */
export function loadPersonTimeline(personId: string, root = process.cwd()): TimelineEvent[] {
  const file = timelinePath(personId, root);
  if (!fs.existsSync(file)) return [];
  return parseTimelineYaml(fs.readFileSync(file, 'utf8'), `people/${personId}/timeline.yml`);
}

/** 每人一行：只含 multi:true 事件；无人 multi 则返回空数组。 */
export function loadMultiLanes(
  people: { id: string; name: string; order: number; accent: string }[],
  root = process.cwd(),
): TimelineLane[] {
  const lanes: TimelineLane[] = [];
  for (const p of [...people].sort((a, b) => a.order - b.order)) {
    const events = loadPersonTimeline(p.id, root).filter((e) => e.multi);
    if (!events.length) continue;
    lanes.push({ personId: p.id, name: p.name, order: p.order, accent: p.accent, events });
  }
  return lanes;
}

/** 全体 multi 事件的年份跨度（含 to），加 pad。 */
export function multiYearSpan(lanes: TimelineLane[], pad = 2): { from: number; to: number } | null {
  const years: number[] = [];
  for (const lane of lanes) {
    for (const e of lane.events) {
      const y = yearOf(e.date);
      if (y !== undefined) years.push(y);
      const t = yearOf(e.to);
      if (t !== undefined) years.push(t);
    }
  }
  if (!years.length) return null;
  return { from: Math.min(...years) - pad, to: Math.max(...years) + pad };
}

export function formatEventWhen(e: { date: string; to?: string }) {
  return e.to ? `${e.date}—${e.to}` : e.date;
}

/** 圆点旁常显短标题：按码点截断，过长加省略号。 */
export function shortTitle(title: string, max = 6): string {
  const chars = [...String(title ?? '').trim()];
  if (chars.length <= max) return chars.join('');
  if (max <= 1) return '…';
  return chars.slice(0, max - 1).join('') + '…';
}
