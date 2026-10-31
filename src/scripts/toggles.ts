// 前端交互：亮暗主题 + 展厅墙视图 + 首页沙龙挂墙轻量轮播。状态存 localStorage。
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

type SalonTile = {
  name: string;
  url: string;
  src: string;
  accent: string;
  initial: string;
};

function fillFrame(frame: HTMLElement, tile: SalonTile) {
  frame.setAttribute('href', tile.url);
  frame.setAttribute('aria-label', tile.name);
  frame.style.setProperty('--accent', tile.accent);
  const tomb = frame.querySelector('.salon-tombstone');
  if (tomb) tomb.textContent = tile.name;
  const img = frame.querySelector<HTMLImageElement>('.salon-img');
  const fallback = frame.querySelector<HTMLElement>('.salon-fallback');
  if (tile.src) {
    if (img) {
      img.src = tile.src;
      img.removeAttribute('hidden');
      img.hidden = false;
    }
    if (fallback) {
      fallback.hidden = true;
      fallback.setAttribute('hidden', '');
    }
  } else {
    if (fallback) {
      fallback.textContent = tile.initial;
      fallback.hidden = false;
      fallback.removeAttribute('hidden');
    }
    if (img) {
      img.hidden = true;
      img.setAttribute('hidden', '');
      img.removeAttribute('src');
    }
  }
}

/**
 * 沙龙挂墙：槽位固定；主位肖像淡入轮换，侧翼显示其余人。
 * prefers-reduced-motion 关轮播。
 */
function initHeroWall() {
  const wall = document.querySelector<HTMLElement>('[data-hero-wall]');
  if (!wall) return;

  let tiles: SalonTile[] = [];
  try {
    tiles = JSON.parse(wall.dataset.tiles || '[]') as SalonTile[];
  } catch {
    return;
  }
  if (tiles.length === 0) return;

  const main = wall.querySelector<HTMLElement>('[data-slot="main"]');
  const wings = [...wall.querySelectorAll<HTMLElement>('[data-slot="wing"]')];
  if (!main) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (tiles.length < 2 || reduce) return;

  let mainIdx = 0;

  const paint = (idx: number, animate: boolean) => {
    const n = tiles.length;
    const order = Array.from({ length: n }, (_, k) => tiles[(idx + k) % n]!);
    if (animate) {
      main.classList.add('is-fading');
      window.setTimeout(() => {
        fillFrame(main, order[0]!);
        main.classList.remove('is-fading');
      }, 280);
    } else {
      fillFrame(main, order[0]!);
    }
    wings.forEach((w, i) => {
      const tile = order[i + 1];
      if (tile) {
        w.hidden = false;
        fillFrame(w, tile);
      } else {
        w.hidden = true;
      }
    });
    mainIdx = idx;
  };

  paint(0, false);

  const INTERVAL_MS = 5600;
  let timer = window.setInterval(() => paint((mainIdx + 1) % tiles.length, true), INTERVAL_MS);

  const pause = () => {
    window.clearInterval(timer);
  };
  const resume = () => {
    window.clearInterval(timer);
    timer = window.setInterval(() => paint((mainIdx + 1) % tiles.length, true), INTERVAL_MS);
  };

  wall.addEventListener('mouseenter', pause);
  wall.addEventListener('mouseleave', resume);
  wall.addEventListener('focusin', pause);
  wall.addEventListener('focusout', (e) => {
    if (!wall.contains(e.relatedTarget as Node | null)) resume();
  });
}

function init() {
  initTheme();
  initWallView();
  initHeroWall();
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
