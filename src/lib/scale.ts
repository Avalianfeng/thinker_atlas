/** 年份 → x 坐标。 */
export function scale([from, to]: [number, number], [x0, x1]: [number, number]) {
  const span = Math.max(1, to - from);
  return (year: number) => x0 + ((year - from) / span) * (x1 - x0);
}

/** 十年刻度：起点向下取整到 10，终点向上取整到 10。 */
export function decadeTicks(from: number, to: number) {
  const out: number[] = [];
  for (let y = Math.floor(from / 10) * 10; y <= Math.ceil(to / 10) * 10; y += 10) out.push(y);
  return out;
}
