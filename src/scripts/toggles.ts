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
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.view-btn[data-wall-view]'));
  if (buttons.length === 0) return;

  const sync = (view: 'detail' | 'cards') => {
    root.dataset.wallView = view;
    for (const wall of document.querySelectorAll<HTMLElement>('.wall')) {
      wall.classList.toggle('wall--cards', view === 'cards');
    }
    for (const btn of buttons) {
      btn.setAttribute('aria-pressed', String(btn.dataset.wallView === view));
    }
  };

  const stored = localStorage.getItem('atlas:wall-view');
  sync(stored === 'cards' ? 'cards' : 'detail');

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const view = btn.dataset.wallView === 'cards' ? 'cards' : 'detail';
      localStorage.setItem('atlas:wall-view', view);
      sync(view);
    });
  }
}

function init() {
  initTheme();
  initWallView();
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
