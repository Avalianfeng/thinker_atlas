import type { APIRoute } from 'astro';
import { getAtlas } from '@lib/atlas';
import { toJson } from '@lib/api';

/** GET /api/v1/index.json — 接口说明与端点清单（版本号在路径里） */
export const prerender = true;

export const GET: APIRoute = async () => {
  const atlas = await getAtlas();
  return toJson({
    api: 'v1',
    name: "Thinker's Atlas",
    description: '只读 JSON 接口。字段只增不删；破坏性改动会升到 /api/v2。',
    auth: '整个站点在 Caddy 后面：网页用 basic auth，/api/ 另用 Bearer token。见 deploy/Caddyfile。',
    counts: {
      thinkers: atlas.thinkers.length,
      concepts: atlas.concepts.length,
      works: atlas.works.length,
      relations: atlas.relations.length,
      journal: atlas.journal.length,
    },
    endpoints: [
      { path: '/api/v1/thinkers.json', description: '人物列表', params: ['scope=public'] },
      { path: '/api/v1/thinkers/{id}.json', description: '单人完整档案：生平事件、概念、作品、关系、正文 Markdown' },
      { path: '/api/v1/concepts.json', description: '全部概念', params: ['scope=public'] },
      { path: '/api/v1/concepts/{thinker}/{concept}.json', description: '单个概念' },
      { path: '/api/v1/relations.json', description: '全部关系', params: ['type=影响', 'thinker=wittgenstein', 'scope=public'] },
      { path: '/api/v1/timeline.json', description: '多人时间线（泳道）' },
      { path: '/api/v1/graph.json', description: '谱系图节点与边' },
      { path: '/api/v1/journal.json', description: '随笔' },
      { path: '/api/public/', description: '只含 visibility: public 的内容，同样的结构' },
    ],
    ids: '所有对象带稳定 ID（atlas:<人物> 或 atlas:<人物>/<条目>），可长期引用。',
    changelog: [
      { version: 'v1', date: '2026-10-31', notes: '首版。' },
    ],
  });
};
