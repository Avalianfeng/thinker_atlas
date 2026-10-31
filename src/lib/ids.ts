/** 纯函数：稳定 ID、URL 与年代。不依赖 Astro 运行时，测试与脚本可以直接用。 */

/** atlas:wittgenstein/tractatus → { thinker: 'wittgenstein', item: 'tractatus' } */
export function parseId(id: string) {
  const [thinker, item] = id.replace(/^atlas:/, '').split('/');
  return { thinker, item };
}

/** 接受 SilverBullet 里的简写 wittgenstein/language-games 或 #atlas/wittgenstein。 */
export function normalizeRef(ref: string) {
  return `atlas:${ref.trim().replace(/^#?atlas[:/]/, '')}`;
}

export const thinkerUrl = (id: string) => `/thinkers/${parseId(id).thinker}/`;
export const conceptUrl = (id: string) => `/thinkers/${parseId(id).thinker}/thought/${parseId(id).item}/`;
export const workUrl = (id: string) => `/thinkers/${parseId(id).thinker}/works/${parseId(id).item}/`;

export function yearOf(date: string | number | undefined): number | undefined {
  if (date === undefined) return undefined;
  const m = /^(-?\d{1,4})/.exec(String(date));
  return m ? Number(m[1]) : undefined;
}

/** 生卒年：1889—1951（破折号）。 */
export function lifespan(t: { data: { born: { date: string }; died?: { date: string } } }) {
  const b = yearOf(t.data.born.date);
  const d = yearOf(t.data.died?.date);
  return `${b}—${d ?? ''}`;
}
