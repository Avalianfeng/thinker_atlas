/**
 * 人物强调色：冷色序列（蓝 / 青 / 灰蓝），按全站出生年升序稳定取色。
 * 同人展牌、寿命条、侧名点、人物页共用；不用 content order，不用暖色。
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
  '#5A8A9E', // mist blue
  '#3E6F8F', // ink blue
] as const;

export type AccentPerson = {
  id: string;
  name?: string;
  born?: string | number | null;
};

function modIndex(n: number, len: number): number {
  return ((Math.trunc(n) % len) + len) % len;
}

/** 出生年升序；无 born 靠后；同岁按 name（再退 id）。 */
export function compareByBorn(a: AccentPerson, b: AccentPerson): number {
  const ba = String(a.born ?? '').trim();
  const bb = String(b.born ?? '').trim();
  const na = String(a.name ?? a.id);
  const nb = String(b.name ?? b.id);
  if (!ba && !bb) return na.localeCompare(nb, 'zh');
  if (!ba) return 1;
  if (!bb) return -1;
  const cmp = ba.localeCompare(bb);
  return cmp !== 0 ? cmp : na.localeCompare(nb, 'zh');
}

/** 全站人物 → id→accent；第 i 人（按 born 序）用 COOL_ACCENTS[i % len]。 */
export function accentMapForPeople(people: AccentPerson[]): Map<string, string> {
  const len = COOL_ACCENTS.length;
  const sorted = [...people].sort(compareByBorn);
  const map = new Map<string, string>();
  sorted.forEach((p, i) => {
    map.set(p.id, COOL_ACCENTS[modIndex(i, len)]!);
  });
  return map;
}

/**
 * 同人同色：必须传入 allPeople（展厅墙全员），按 born 序取色。
 * 无花名册时退回盘首色（勿用 order / id 哈希钉死）。
 */
export function personAccent(opts: {
  id: string;
  name?: string;
  born?: string | number | null;
  allPeople: AccentPerson[];
}): string {
  if (!opts.allPeople?.length) return COOL_ACCENTS[0]!;
  const map = accentMapForPeople(opts.allPeople);
  return map.get(opts.id) ?? COOL_ACCENTS[0]!;
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
