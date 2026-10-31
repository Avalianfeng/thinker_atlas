import { describe, it, expect, vi } from 'vitest';
import { silverbulletAdapter } from '../scripts/adapters/silverbullet.mjs';

/** 用内存中的假 HTTP 客户端模拟 SilverBullet 的 /.fs/ 接口。 */
function fakeServer(initial = {}) {
  const files = new Map(Object.entries(initial));
  const calls = [];
  const fetchImpl = vi.fn(async (url, init = {}) => {
    const method = init.method || 'GET';
    const path = decodeURIComponent(new URL(url).pathname.replace(/^\/\.fs\/?/, ''));
    calls.push({ method, path });

    if (method === 'PUT') {
      files.set(path, init.body);
      return new Response('ok', { status: 200 });
    }
    if (method === 'GET') {
      if (path === '' || [...files.keys()].some((f) => f.startsWith(path + '/')) || files.has(path + '/_index.md')) {
        const prefix = path ? path + '/' : '';
        const names = new Set();
        for (const f of files.keys()) {
          if (!f.startsWith(prefix)) continue;
          const rest = f.slice(prefix.length);
          names.add(rest.split('/')[0]);
        }
        const list = [...names].map((name) => ({ name }));
        return new Response(JSON.stringify(list), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (files.has(path)) {
        return new Response(files.get(path), { status: 200, headers: { 'last-modified-ms': '1700000000000' } });
      }
      return new Response('not found', { status: 404 });
    }
    return new Response('bad', { status: 400 });
  });
  return { files, calls, fetchImpl };
}

const adapterFor = (server, extra = {}) =>
  silverbulletAdapter({ baseUrl: 'https://note.example.com/', auth: 'me:secret', fetchImpl: server.fetchImpl, ...extra });

describe('SilverBullet 适配器（mock /.fs/）', () => {
  it('用 Basic 头鉴权，路径走 /.fs/', async () => {
    const server = fakeServer({ 'atlas/a.md': 'hi' });
    const a = adapterFor(server);
    const f = await a.read('atlas/a.md');
    expect(f.content).toBe('hi');
    expect(f.lastModified).toBe(1700000000000);
    const req = server.fetchImpl.mock.calls[0];
    expect(req[0]).toBe('https://note.example.com/.fs/atlas/a.md');
    expect(req[1].headers.Authorization).toBe('Basic ' + Buffer.from('me:secret').toString('base64'));
  });

  it('已带 scheme 的 token 原样使用', async () => {
    const server = fakeServer({ 'atlas/a.md': 'hi' });
    const a = silverbulletAdapter({ baseUrl: 'https://n.test', auth: 'Bearer abc123', fetchImpl: server.fetchImpl });
    await a.read('atlas/a.md');
    expect(server.fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer abc123');
  });

  it('列目录时跳过 _index.md 并递归子目录', async () => {
    const server = fakeServer({
      'atlas/a.md': 'a',
      'atlas/_index.md': 'index',
      'atlas/sub/b.md': 'b',
      'atlas/img.png': 'binary',
    });
    const a = adapterFor(server);
    const list = await a.list('atlas');
    expect(list.map((f) => f.page).sort()).toEqual(['atlas/a.md', 'atlas/sub/b.md']);
  });

  it('读不存在的文件返回 null 而不是抛错', async () => {
    const a = adapterFor(fakeServer());
    expect(await a.read('atlas/none.md')).toBeNull();
  });

  it('写入用 PUT 到 /.fs/，中文与空格被编码', async () => {
    const server = fakeServer();
    const a = adapterFor(server);
    await a.write('atlas/读书 笔记.md', '内容');
    expect(server.files.get('atlas/读书 笔记.md')).toBe('内容');
    const put = server.calls.find((c) => c.method === 'PUT');
    expect(put.method).toBe('PUT');
    expect(put.path).toBe('atlas/读书 笔记.md');
    expect(server.fetchImpl.mock.calls[0][0]).toContain('/.fs/atlas/%E8%AF%BB%E4%B9%A6%20%E7%AC%94%E8%AE%B0.md');
  });

  it('写入失败时报出状态码，避免静默丢内容', async () => {
    const fetchImpl = vi.fn(async () => new Response('no', { status: 403 }));
    const a = silverbulletAdapter({ baseUrl: 'https://n.test', auth: 'x:y', fetchImpl });
    await expect(a.write('atlas/a.md', 'x')).rejects.toThrow(/403/);
  });

  it('列目录失败时报错', async () => {
    const fetchImpl = vi.fn(async () => new Response('no', { status: 401 }));
    const a = silverbulletAdapter({ baseUrl: 'https://n.test', auth: 'x:y', fetchImpl });
    await expect(a.list('atlas')).rejects.toThrow(/401/);
  });

  it('ping 在 404 时也视为连通（目录尚未创建）', async () => {
    const a = adapterFor(fakeServer());
    expect(await a.ping()).toBe(true);
  });
});
