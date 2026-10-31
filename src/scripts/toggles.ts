// 前端交互：亮暗主题 + 展厅墙视图 + 首页肖像墙轻量轮播。状态存 localStorage。
const root = document.documentElement;

function initTheme() {
  const themeBtn = document.getElementById('tg-theme');
  const icon = themeBtn?.querySelector('.theme-icon');

  const syncTheme = (dark: boolean) => {
    root.dataset.theme = dark ? 'dark' : 'light';
    themeBtn?.setAttribute('aria-pressed', String(dark));
    themeBtn?.setAttribute('aria-label', dark ? '切换到亮色' : '切换到暗色');
    if (icon) icon.textContent = dark ? '☀' : '☾';
  };

  syncTheme(root.dataset.theme === 'dark');

  themeBtn?.addEventListener('click', () => {
    const dark = root.dataset.theme !== 'dark';
    localStorage.setItem('atlas:theme', dark ? 'dark' : 'light');
    syncTheme(dark);
  });
}

function initWallView() {
  const btn = document.getElementById('tg-wall-view') as HTMLButtonElement | null;
  if (!btn) return;

  const sync = (view: 'detail' | 'cards') => {
    root.dataset.wallView = view;
    for (const wall of document.querySelectorAll<HTMLElement>('.wall')) {
      wall.classList.toggle('wall--cards', view === 'cards');
    }
    // 按钮显示另一态名：点一下切过去
    const next = view === 'cards' ? 'detail' : 'cards';
    const label = next === 'cards' ? '卡片' : '详牌';
    btn.textContent = label;
    btn.setAttribute('aria-label', `切换到${label}`);
  };

  const stored = localStorage.getItem('atlas:wall-view');
  sync(stored === 'cards' ? 'cards' : 'detail');

  btn.addEventListener('click', () => {
    const next = root.dataset.wallView === 'cards' ? 'detail' : 'cards';
    localStorage.setItem('atlas:wall-view', next);
    sync(next);
  });
}

/** 首页肖像墙：同批肖像轻量自动轮播（淡入强调当前格）；尊重 reduced-motion。 */
function initHeroWall() {
  const wall = document.querySelector<HTMLElement>('[data-hero-wall]');
  if (!wall) return;
  const tiles = [...wall.querySelectorAll<HTMLElement>('.portrait-wall-tile')];
  if (tiles.length < 2) {
    tiles[0]?.classList.add('is-active');
    return;
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    for (const t of tiles) t.classList.add('is-active');
    return;
  }

  let i = tiles.findIndex((t) => t.classList.contains('is-active'));
  if (i < 0) i = 0;

  const show = (next: number) => {
    tiles.forEach((t, idx) => t.classList.toggle('is-active', idx === next));
    i = next;
  };
  show(i);

  const INTERVAL_MS = 5200;
  let timer = window.setInterval(() => show((i + 1) % tiles.length), INTERVAL_MS);

  const pause = () => {
    window.clearInterval(timer);
  };
  const resume = () => {
    window.clearInterval(timer);
    timer = window.setInterval(() => show((i + 1) % tiles.length), INTERVAL_MS);
  };

  wall.addEventListener('mouseenter', pause);
  wall.addEventListener('mouseleave', resume);
  wall.addEventListener('focusin', pause);
  wall.addEventListener('focusout', (e) => {
    if (!wall.contains(e.relatedTarget as Node | null)) resume();
  });

  for (const [idx, tile] of tiles.entries()) {
    tile.addEventListener('pointerenter', () => show(idx));
  }
}

function init() {
  initTheme();
  initWallView();
  initHeroWall();
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
