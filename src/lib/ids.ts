/** 纯函数：人物 id、URL 与年代。不依赖 Astro 运行时，测试与脚本可以直接用。 */

/** atlas:wittgenstein/tractatus 或 wittgenstein → { thinker, person, item } */
export function parseId(id: string) {
  const raw = id.replace(/^atlas:/, '');
  const [person, item] = raw.split('/');
  return { thinker: person, person, item };
}

/** 接受简写或旧 #atlas/ 前缀；规范为 atlas:…（遗留 sync 与测试仍用此前缀）。 */
export function normalizeRef(ref: string) {
  return `atlas:${ref.trim().replace(/^#?atlas[:/]/, '')}`;
}

export const personUrl = (id: string) => `/people/${parseId(id).person}/`;
/** @deprecated 用 personUrl */
export const thinkerUrl = personUrl;
export const conceptUrl = (id: string) => {
  const { person, item } = parseId(id);
  return `/people/${person}/${item ? `#${item}` : ''}`;
};
export const workUrl = conceptUrl;

export function yearOf(date: string | number | undefined): number | undefined {
  if (date === undefined) return undefined;
  const m = /^(-?\d{1,4})/.exec(String(date));
  return m ? Number(m[1]) : undefined;
}

/** 生卒年：1889—1951。接受 v2 扁平字段或遗留 { date }。 */
export function lifespan(t: {
  data: {
    born?: string | number | { date: string | number };
    died?: string | number | { date: string | number };
  };
}) {
  const born = t.data.born;
  const died = t.data.died;
  const b = yearOf(typeof born === 'object' && born ? born.date : born);
  const d = yearOf(typeof died === 'object' && died ? died.date : died);
  if (b === undefined && d === undefined) return '';
  return `${b ?? ''}—${d ?? ''}`;
}
