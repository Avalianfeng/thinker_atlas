/**
 * 人物强调色：固定冷色序列（蓝 / 青 / 灰蓝），按 order 或 id 稳定取色。
 * 同人展牌、寿命条、侧名点共用，避免暖色主导。
 */
export const COOL_ACCENTS = [
  '#3D5A80', // steel blue
  '#457B9D', // medium blue
  '#2E6B7A', // deep cyan
  '#5B7C99', // gray-blue
  '#4A7C8C', // blue-teal
  '#6B8CAE', // soft steel
  '#4C6B82', // slate blue
  '#3A7D8C', // sea cyan
] as const;

function modIndex(n: number, len: number): number {
  return ((Math.trunc(n) % len) + len) % len;
}

function hashKey(key: string): number {
  let seed = 0;
  for (const ch of key) seed = (seed + (ch.codePointAt(0) ?? 0)) % 2147483647;
  return seed;
}

/**
 * 优先 order（整数），否则对 id（再退 name）做稳定哈希。
 */
export function personAccent(opts: { order?: number; id?: string; name?: string }): string {
  const len = COOL_ACCENTS.length;
  if (typeof opts.order === 'number' && Number.isFinite(opts.order)) {
    return COOL_ACCENTS[modIndex(opts.order, len)]!;
  }
  const key = String(opts.id || opts.name || '').trim();
  if (!key) return COOL_ACCENTS[0]!;
  return COOL_ACCENTS[modIndex(hashKey(key), len)]!;
}

/** kind → 形状（多人线 SVG 标记；不以颜色区分 kind） */
export const KIND_SHAPE = {
  life: 'filled-circle',
  write: 'hollow-circle',
  publish: 'filled-square',
  meet: 'filled-diamond',
  context: 'hollow-triangle',
} as const;

export type KindShape = (typeof KIND_SHAPE)[keyof typeof KIND_SHAPE];
