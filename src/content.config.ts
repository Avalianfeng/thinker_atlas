import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** 人物夹名 = id：小写、连字符。 */
const personId = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '人物 id 形如 wittgenstein');

const visibility = z.enum(['private', 'public']).default('private');
const pieceKind = z.enum(['life', 'work', 'note', 'other']);

/** 日期字符串，防 YAML 吞零：建议加引号。 */
const dateStr = z.union([z.string(), z.number(), z.date()]).transform((v) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
});

const people = defineCollection({
  loader: glob({
    pattern: '*/index.md',
    base: './content/people',
    generateId: ({ data }) => String(data.id),
  }),
  schema: z.object({
    id: personId,
    name: z.string(),
    name_en: z.string().optional(),
    born: dateStr.optional(),
    died: dateStr.optional(),
    order: z.number().int(),
    intro: z.string(),
    portrait: z.string().optional(),
    visibility,
  }),
});

/** 同目录除 index.md 外的 *.md，按文件名排序为篇章。 */
const pieces = defineCollection({
  loader: glob({
    pattern: ['*/*.md', '!*/index.md'],
    base: './content/people',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    kind: pieceKind,
  }),
});

export const collections = { people, pieces };
