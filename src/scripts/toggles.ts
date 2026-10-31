// 仅有的前端交互：亮暗主题切换。状态存 localStorage。
const root = document.documentElement;

function init() {
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

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
