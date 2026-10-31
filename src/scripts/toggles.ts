// 前端交互：亮暗主题 + 展厅墙视图。状态存 localStorage。
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

function init() {
  initTheme();
  initWallView();
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
