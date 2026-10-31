export interface YearEvent {
  year: number;
  title: string;
  kind: string;
  date?: string;
}

/** 生卒区间，向前后各留一点余量。 */
export function yearRange(born: number, died: number | undefined, pad = 2) {
  const end = died ?? new Date().getFullYear();
  return { from: Math.min(born, end) - pad, to: Math.max(born, end) + pad };
}

export const BANDS = [
  { label: '一战', from: 1914, to: 1918 },
  { label: '魏玛', from: 1919, to: 1933 },
  { label: '二战', from: 1939, to: 1945 },
  { label: '1968', from: 1968, to: 1968 },
];

export function scale(from: number, to: number, x0: number, x1: number) {
  const span = Math.max(1, to - from);
  return (y: number) => x0 + ((y - from) / span) * (x1 - x0);
}

export function tickYears(from: number, to: number, step = 10) {
  const start = Math.ceil(from / step) * step;
  const out: number[] = [];
  for (let y = start; y <= to; y += step) out.push(y);
  return out;
}

/** 事件标签是否向左排（避免超出右边界）。 */
export const alignLeft = (x: number, width: number) => x > width - 90;
