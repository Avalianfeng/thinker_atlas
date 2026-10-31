export type Provenance = 'own' | 'own-discussed' | 'transcribed' | 'quote' | 'secondary' | 'ai-excerpt';

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  own: '自己的',
  'own-discussed': '讨论后自写',
  transcribed: '转写',
  quote: '原文引文',
  secondary: '二手文献',
  'ai-excerpt': 'AI 摘录',
};

export interface ProvenanceStats {
  own: number;
  original: number;
  secondary: number;
  ai: number;
  todo: number;
  total: number;
}

export const emptyStats = (): ProvenanceStats => ({ own: 0, original: 0, secondary: 0, ai: 0, todo: 0, total: 0 });

const count = (s: string) =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/[\s#>*_`\-|[\]()]/g, '')
    .replace(/[。，、；：？！“”‘’（）《》〈〉【】…—·「」]/g, '').length;

function bucket(p: string): keyof Omit<ProvenanceStats, 'todo' | 'total'> {
  if (p === 'own' || p === 'own-discussed') return 'own';
  if (p === 'transcribed' || p === 'quote') return 'original';
  if (p === 'secondary') return 'secondary';
  if (p === 'ai-excerpt') return 'ai';
  return 'own';
}

/**
 * 统计正文中各来源的字数。未标注的正文默认为 own；<Todo> 只计数不计字。
 * 只做近似统计（按非空白字符），用于来源占比条。
 */
export function provenanceStats(body: string | undefined, defaultFrom: Provenance = 'own'): ProvenanceStats {
  const s = emptyStats();
  if (!body) return s;
  let rest = body.replace(/```[\s\S]*?```/g, '').replace(/^(import|export)\s.*$/gm, '');
  const re = /<(Block|Quote|Note|Todo|Dialogue)\b([^>]*)>([\s\S]*?)<\/\1>/g;
  rest = rest.replace(re, (_m, tag: string, attrs: string, inner: string) => {
    if (tag === 'Todo') {
      s.todo += 1;
      return '';
    }
    const from = /\bfrom="([^"]+)"/.exec(attrs)?.[1];
    const p = tag === 'Block' ? from || 'own' : tag === 'Quote' ? from || 'quote' : 'own';
    s[bucket(p)] += count(inner);
    return '';
  });
  rest = rest.replace(/^#{1,6}\s.*$/gm, '').replace(/<[^>]+\/>/g, '');
  s[bucket(defaultFrom)] += count(rest);
  s.total = s.own + s.original + s.secondary + s.ai;
  return s;
}

export function addStats(a: ProvenanceStats, b: ProvenanceStats): ProvenanceStats {
  const r = {
    own: a.own + b.own,
    original: a.original + b.original,
    secondary: a.secondary + b.secondary,
    ai: a.ai + b.ai,
    todo: a.todo + b.todo,
    total: 0,
  };
  r.total = r.own + r.original + r.secondary + r.ai;
  return r;
}

/** 提取正文中的 <Note> 批注（用于概念页"我的批注汇总"）。 */
export function extractNotes(body: string | undefined): { id?: string; title?: string; text: string }[] {
  if (!body) return [];
  const out: { id?: string; title?: string; text: string }[] = [];
  const re = /<Note\b([^>]*)>([\s\S]*?)<\/Note>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    out.push({
      id: /\bid="([^"]+)"/.exec(m[1])?.[1],
      title: /\btitle="([^"]+)"/.exec(m[1])?.[1],
      text: m[2].trim(),
    });
  }
  return out;
}
