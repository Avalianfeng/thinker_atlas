/**
 * SilverBullet 适配器：走 HTTP 的 /.fs/ 文件接口，不直接读 VPS 上的 data/ 目录。
 * 这样 SilverBullet 搬家或换机器都不影响同步。
 *
 * 认证：SB_USER（形如 user:password 或 token），放在本地 .env，不进 git。
 * 接口：GET /.fs/<path> 读文件；PUT /.fs/<path> 写文件；GET /.fs 列目录（JSON）。
 */

/**
 * @param {{ baseUrl: string, auth?: string, fetchImpl?: typeof fetch, folder?: string }} opts
 * @returns {import('./notes.mjs').SourceAdapter}
 */
export function silverbulletAdapter({ baseUrl, auth, fetchImpl = fetch, folder = '' }) {
  const root = baseUrl.replace(/\/$/, '');
  const headers = () => {
    const h = { 'Content-Type': 'text/markdown; charset=utf-8' };
    if (auth) {
      // 支持 user:pass 形式，也支持已经带 scheme 的 token
      h.Authorization = /^(Basic|Bearer)\s/i.test(auth) ? auth : `Basic ${Buffer.from(auth).toString('base64')}`;
    }
    return h;
  };
  const urlOf = (page) => `${root}/.fs/${page.split('/').map(encodeURIComponent).join('/')}`;

  return {
    name: 'silverbullet',

    async list(dir) {
      const res = await fetchImpl(urlOf(dir), { headers: headers() });
      if (!res.ok) throw new Error(`SilverBullet 列目录失败 ${res.status}：/.fs/${dir}`);
      const data = await res.json();
      const entries = Array.isArray(data) ? data : (data.files ?? []);
      const files = entries
        .map((e) => (typeof e === 'string' ? { name: e } : e))
        .filter((e) => e.name && !e.name.startsWith('.'))
        .map((e) => ({ ...e, name: e.name }));
      const out = [];
      for (const e of files) {
        const page = `${dir.replace(/\/$/, '')}/${e.name}`;
        if (e.name.endsWith('.md') && e.name !== '_index.md') {
          const file = await this.read(page);
          if (file) out.push(file);
        } else if (!e.name.includes('.') || e.isFolder) {
          out.push(...(await this.list(page)));
        }
      }
      return out;
    },

    async read(page) {
      const res = await fetchImpl(urlOf(page), { headers: headers() });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`SilverBullet 读取失败 ${res.status}：/.fs/${page}`);
      const lastModified = Number(res.headers.get('last-modified-ms') || res.headers.get('x-last-modified') || 0) || undefined;
      return { page, content: await res.text(), lastModified };
    },

    async write(page, content) {
      const res = await fetchImpl(urlOf(page), { method: 'PUT', headers: headers(), body: content });
      if (!res.ok) throw new Error(`SilverBullet 写入失败 ${res.status}：/.fs/${page}`);
    },

    async ping() {
      try {
        const res = await fetchImpl(urlOf(folder || 'atlas'), { headers: headers() });
        return res.ok || res.status === 404;
      } catch {
        return false;
      }
    },
  };
}
