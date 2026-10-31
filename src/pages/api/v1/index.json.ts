import type { APIRoute } from 'astro';
import { getAtlas } from '@lib/atlas';
import { toJson } from '@lib/api';

export const prerender = true;

export const GET: APIRoute = async () => {
  const atlas = await getAtlas();
  return toJson({
    api: 'v1',
    name: "Thinker's Atlas",
    description: '只读 JSON 接口（content v2：people/）。字段只增不删。',
    counts: {
      people: atlas.people.length,
      pieces: atlas.pieces.length,
    },
    endpoints: [
      { path: '/api/v1/people.json', description: '人物列表', params: ['scope=public'] },
      { path: '/api/v1/people/{id}.json', description: '单人档案与篇章' },
      { path: '/api/public/', description: '只含 visibility: public 的内容' },
    ],
    ids: '人物 id = content/people/<id>/ 夹名（小写连字符）。',
    changelog: [
      { version: 'v1', date: '2026-10-31', notes: 'content v2：people/ 扁平 Markdown。' },
    ],
  });
};
