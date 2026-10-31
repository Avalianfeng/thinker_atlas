import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** 稳定 ID：atlas:<人物> 或 atlas:<人物>/<条目>。永不改变。 */
const thinkerId = z.string().regex(/^atlas:[a-z0-9-]+$/, '人物 ID 形如 atlas:wittgenstein');
const entityId = z.string().regex(/^atlas:[a-z0-9-]+\/[a-z0-9-]+$/, '条目 ID 形如 atlas:wittgenstein/language-games');
const anyId = z.string().regex(/^atlas:[a-z0-9-]+(\/[a-z0-9-]+)?$/, 'ID 形如 atlas:wittgenstein 或 atlas:wittgenstein/tractatus');

/** 日期：年份、YYYY-MM 或 YYYY-MM-DD。YAML 自动解析出的 Date 也接受。 */
const fuzzyDate = z
  .union([z.number().int(), z.string().regex(/^-?\d{1,4}(-\d{2}(-\d{2})?)?$/, '日期写作 1889、1889-04 或 1889-04-26'), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v)));

const provenance = z.enum(['own', 'own-discussed', 'transcribed', 'quote', 'secondary', 'ai-excerpt']);
const visibility = z.enum(['private', 'public']).default('private');
const maturity = z.enum(['种子', '生长中', '成形']);
const relationType = z.enum(['影响', '批判', '师承', '对话', '平行', '误读']);
const eventKind = z.enum(['生活', '写作', '出版', '相遇', '历史背景']);

const sourced = z.object({
  text: z.string(),
  original: z.string().optional(),
  lang: z.string().optional(),
  source: z.string().optional(),
  translator: z.string().optional(),
  from: provenance.default('quote'),
});

const thinkers = defineCollection({
  loader: glob({ pattern: '*/index.{md,mdx}', base: './content/thinkers', generateId: ({ data }) => String(data.id) }),
  schema: z.object({
    id: thinkerId,
    name: z.object({ zh: z.string(), en: z.string(), original: z.string().optional() }),
    born: z.object({ date: fuzzyDate, place: z.string().optional() }),
    died: z.object({ date: fuzzyDate, place: z.string().optional() }).optional(),
    fields: z.array(z.string()).default([]),
    maturity,
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    order: z.number().int(),
    added: fuzzyDate,
    intro: z.string(),
    epigraph: sourced.optional(),
    portrait: z.string().optional(),
    periods: z
      .array(z.object({ id: z.string(), label: z.string(), from: z.number().int(), to: z.number().int() }))
      .default([]),
    visibility,
  }),
});

const life = defineCollection({
  loader: glob({ pattern: '*/life.{md,mdx}', base: './content/thinkers' }),
  schema: z.object({
    thinker: thinkerId,
    title: z.string().default('生平'),
    events: z
      .array(
        z.object({
          date: fuzzyDate,
          to: fuzzyDate.optional(),
          kind: eventKind,
          title: z.string(),
          place: z.string().optional(),
          note: z.string().optional(),
          source: z.string().optional(),
          work: entityId.optional(),
        }),
      )
      .default([]),
    visibility,
  }),
});

const concepts = defineCollection({
  loader: glob({ pattern: '*/thought/*.{md,mdx}', base: './content/thinkers', generateId: ({ data }) => String(data.id) }),
  schema: z.object({
    id: entityId,
    title: z.string(),
    original: z.string().optional(),
    lang: z.string().optional(),
    period: z.string().optional(),
    definition: z.string(),
    questions: z.array(z.string()).default([]),
    builds_on: z.array(entityId).default([]),
    contrasts_with: z.array(entityId).default([]),
    works: z.array(entityId).default([]),
    evolution: z.array(z.object({ period: z.string(), text: z.string(), ref: entityId.optional() })).default([]),
    interlocutors: z.array(z.object({ concept: anyId, note: z.string().optional() })).default([]),
    terms: z.array(z.object({ zh: z.string(), original: z.string(), lang: z.string().optional() })).default([]),
    order: z.number().default(100),
    visibility,
  }),
});

const works = defineCollection({
  loader: glob({ pattern: '*/works/*.{md,mdx}', base: './content/thinkers', generateId: ({ data }) => String(data.id) }),
  schema: z.object({
    id: entityId,
    title: z.string(),
    original: z.string(),
    alt_titles: z.array(z.string()).default([]),
    lang: z.string().optional(),
    year: z.number().int(),
    written: z.union([z.string(), z.number()]).transform(String).optional(),
    period: z.string().optional(),
    editions: z.array(z.string()).default([]),
    reading: z.string().optional(),
    structure: z.array(z.object({ n: z.string(), title: z.string(), original: z.string().optional() })).default([]),
    theses: z.array(z.string()).default([]),
    concepts: z.array(entityId).default([]),
    visibility,
  }),
});

const afterlife = defineCollection({
  loader: glob({ pattern: '*/afterlife.{md,mdx}', base: './content/thinkers' }),
  schema: z.object({
    thinker: thinkerId,
    title: z.string().default('身后'),
    mentions: z.array(thinkerId).default([]),
    visibility,
  }),
});

const paths = defineCollection({
  loader: glob({ pattern: '*/path.{md,mdx}', base: './content/thinkers' }),
  schema: z.object({
    thinker: thinkerId,
    title: z.string().default('学习路径'),
    steps: z
      .array(
        z.object({
          title: z.string(),
          read: z.array(z.string()).default([]),
          refs: z.array(anyId).default([]),
          goal: z.string().optional(),
          status: z.enum(['未开始', '进行中', '完成']).default('未开始'),
          checkpoints: z.array(z.object({ text: z.string(), done: z.boolean().default(false) })).default([]),
        }),
      )
      .default([]),
    visibility,
  }),
});

const relations = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './content/relations', generateId: ({ data }) => String(data.id) }),
  schema: z.object({
    id: z.string().regex(/^atlas:rel\/[a-z0-9-]+$/, '关系 ID 形如 atlas:rel/wittgenstein--feyerabend'),
    from: anyId,
    to: anyId,
    type: relationType,
    directed: z.boolean().default(true),
    since: z.number().int().optional(),
    until: z.number().int().optional(),
    summary: z.string(),
    source: z.string().optional(),
    provenance: provenance.default('own'),
    verified: z.boolean().default(true),
    visibility,
  }),
});

const journal = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!**/*.conflict.md'],
    base: './content/journal',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.looseObject({
    title: z.string().optional(),
    date: fuzzyDate.optional(),
    atlas: z.union([z.string(), z.array(z.string())]).optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    visibility,
  }),
});

/** 遗留笔记缓存（content/sb-cache/）。独立 Atlas 默认不拉取；可删示例后留空。 */
const sbnotes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/sb-cache' }),
  schema: z.object({
    page: z.string(),
    title: z.string(),
    atlas: z.array(anyId),
    lastModified: z.number().optional(),
    url: z.string().optional(),
  }),
});

export const collections = { thinkers, life, concepts, works, afterlife, paths, relations, journal, sbnotes };
