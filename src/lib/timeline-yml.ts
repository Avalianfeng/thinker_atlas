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
  /** index.md born；寿命条与轴跨度用 */
  born?: string;
  /** index.md died；缺省视为在世（轴用「至今」年） */
  died?: string;
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

export type MultiLanePerson = {
  id: string;
  name: string;
  order: number;
  accent: string;
  born?: string;
  died?: string;
};

/** 每人一行：只含 multi:true 事件；无人 multi 则返回空数组。 */
export function loadMultiLanes(people: MultiLanePerson[], root = process.cwd()): TimelineLane[] {
  const lanes: TimelineLane[] = [];
  for (const p of [...people].sort((a, b) => a.order - b.order)) {
    const events = loadPersonTimeline(p.id, root).filter((e) => e.multi);
    if (!events.length) continue;
    lanes.push({
      personId: p.id,
      name: p.name,
      order: p.order,
      accent: p.accent,
      born: p.born,
      died: p.died,
      events,
    });
  }
  return lanes;
}

/** 当前年（寿命条「至今」、轴上界）；可注入便于测。 */
export function currentYear(now = new Date()): number {
  return now.getFullYear();
}

/**
 * 一行寿命条端点：有 born → born…died|至今；无 born → 回退事件年跨度。
 * 返回年份；无任何可用年则 null。
 */
export function laneLifeSpan(
  lane: Pick<TimelineLane, 'born' | 'died' | 'events'>,
  nowYear = currentYear(),
): { from: number; to: number } | null {
  const bornY = yearOf(lane.born);
  const diedY = yearOf(lane.died);
  if (bornY !== undefined) {
    return { from: bornY, to: diedY !== undefined ? diedY : nowYear };
  }
  const years: number[] = [];
  for (const e of lane.events) {
    const y = yearOf(e.date);
    if (y !== undefined) years.push(y);
    const t = yearOf(e.to);
    if (t !== undefined) years.push(t);
  }
  if (!years.length) return null;
  return { from: Math.min(...years), to: Math.max(...years) };
}

/** 全体 born/died ∪ multi 事件年的跨度，加 pad。 */
export function multiYearSpan(
  lanes: TimelineLane[],
  pad = 2,
  nowYear = currentYear(),
): { from: number; to: number } | null {
  const years: number[] = [];
  for (const lane of lanes) {
    const life = laneLifeSpan(lane, nowYear);
    if (life) {
      years.push(life.from, life.to);
    }
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

/** 事件年 − 出生年；有 born 才返回。 */
export function ageAtEvent(born: string | undefined, eventDate: string): number | undefined {
  const b = yearOf(born);
  const y = yearOf(eventDate);
  if (b === undefined || y === undefined) return undefined;
  return y - b;
}

/** 估短标题像素宽：CJK≈字号，其余≈0.55×字号。 */
export function estimateLabelWidth(text: string, fontSize = 10): number {
  let w = 0;
  for (const ch of String(text)) {
    const cp = ch.codePointAt(0) ?? 0;
    const cjk =
      (cp >= 0x2e80 && cp <= 0x9fff) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xff00 && cp <= 0xffef) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      cp === 0x2026; /* … */
    w += cjk ? fontSize : fontSize * 0.55;
  }
  return w;
}

export type LabelPlacement = {
  /** 是否画短标题；false 则仅圆点（全文仍靠 tip） */
  show: boolean;
  /** 相对圆点 cy 的文字基线偏移（正=下） */
  dy: number;
  /** 是否画细虚线引回圆点（非默认下方时） */
  leader: boolean;
};

const DEFAULT_DY = 16;
const STACK_STEP = 12;
/** 行高 ~72 → 约 1–2 层：默认下 + 上 + 各一栈 */
const CANDIDATE_DYS = [DEFAULT_DY, -DEFAULT_DY, DEFAULT_DY + STACK_STEP, -(DEFAULT_DY + STACK_STEP)];

type Placed = { cx: number; halfW: number; dy: number };

function overlaps(a: Placed, b: Placed, pad = 4): boolean {
  if (Math.abs(a.dy - b.dy) >= STACK_STEP - 1) return false;
  return Math.abs(a.cx - b.cx) < a.halfW + b.halfW + pad;
}

/**
 * 同行短标题避让：按时间扫；冲突则上/下交替或栈偏；超层则省略短标。
 * 不引入 Labella / vis-timeline。
 */
export function layoutLaneLabels(
  items: { cx: number; short: string }[],
  fontSize = 10,
): LabelPlacement[] {
  const indexed = items.map((it, i) => ({ ...it, i, halfW: estimateLabelWidth(it.short, fontSize) / 2 }));
  indexed.sort((a, b) => a.cx - b.cx || a.i - b.i);

  const placed: Placed[] = [];
  const out: LabelPlacement[] = items.map(() => ({ show: false, dy: DEFAULT_DY, leader: false }));

  for (const it of indexed) {
    let chosen: number | null = null;
    for (const dy of CANDIDATE_DYS) {
      const cand: Placed = { cx: it.cx, halfW: it.halfW, dy };
      if (placed.every((p) => !overlaps(cand, p))) {
        chosen = dy;
        break;
      }
    }
    if (chosen === null) {
      out[it.i] = { show: false, dy: DEFAULT_DY, leader: false };
      continue;
    }
    placed.push({ cx: it.cx, halfW: it.halfW, dy: chosen });
    out[it.i] = {
      show: true,
      dy: chosen,
      leader: chosen !== DEFAULT_DY,
    };
  }
  return out;
}
