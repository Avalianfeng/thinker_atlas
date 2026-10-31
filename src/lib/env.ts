const base = (import.meta.env.SB_PUBLIC_URL || import.meta.env.SB_URL || '').replace(/\/$/, '');

/** SilverBullet 页面的浏览器地址；未配置 SB_URL 时返回 undefined。 */
export function sbPageUrl(page: string | undefined) {
  if (!page || !base) return undefined;
  return `${base}/${page.replace(/\.md$/, '').split('/').map(encodeURIComponent).join('/')}`;
}
