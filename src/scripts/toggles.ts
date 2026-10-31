// 仅有的前端交互：来源显示、批注显示、亮暗切换。状态存 localStorage。
const root = document.documentElement;

function setFlag(key: 'sources' | 'notes', on: boolean) {
  root.dataset[key] = on ? 'on' : 'off';
  localStorage.setItem(`atlas:${key}`, on ? 'on' : 'off');
  document.getElementById(`tg-${key}`)?.setAttribute('aria-pressed', String(on));
}

function init() {
  const sourcesOn = localStorage.getItem('atlas:sources') !== 'off';
  const notesOn = localStorage.getItem('atlas:notes') !== 'off';
  setFlag('sources', sourcesOn);
  setFlag('notes', notesOn);

  const themeBtn = document.getElementById('tg-theme');
  const syncTheme = (dark: boolean) => {
    root.dataset.theme = dark ? 'dark' : 'light';
    themeBtn?.setAttribute('aria-pressed', String(dark));
    themeBtn && (themeBtn.textContent = dark ? '纸色' : '夜读');
  };
  syncTheme(root.dataset.theme === 'dark');

  document.getElementById('tg-sources')?.addEventListener('click', () => setFlag('sources', root.dataset.sources !== 'on'));
  document.getElementById('tg-notes')?.addEventListener('click', () => setFlag('notes', root.dataset.notes !== 'on'));
  themeBtn?.addEventListener('click', () => {
    const dark = root.dataset.theme !== 'dark';
    localStorage.setItem('atlas:theme', dark ? 'dark' : 'light');
    syncTheme(dark);
  });
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
