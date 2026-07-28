(function bootstrapMainMenu() {
  const actions = [
    { menuId: 'new-game', elementId: 'btn-start', label: '新的游戏', icon: 'ph-play', tone: 'primary' },
    { menuId: 'save-slots', elementId: 'btn-menu-slots', label: '存档管理', icon: 'ph-floppy-disk', tone: 'cyan' },
    { menuId: 'leaderboard', elementId: 'btn-menu-lb', label: '排行榜', icon: 'ph-trophy', tone: 'lime' },
  ];

  const root = document.getElementById('main-menu-actions');
  if (!root) return;

  let selectedIndex = 0;

  function render() {
    root.replaceChildren(...actions.map((action, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = action.elementId;
      button.className = `main-menu-action main-menu-action--${action.tone}`;
      button.dataset.menuAction = '';
      button.dataset.menuId = action.menuId;
      button.dataset.index = String(index);
      button.innerHTML = `
        <span class="main-menu-action__selector" aria-hidden="true"></span>
        <span class="main-menu-action__frame" aria-hidden="true"></span>
        <span class="main-menu-action__scan" aria-hidden="true"></span>
        <i class="ph ${action.icon} main-menu-action__icon" aria-hidden="true"></i>
        <span class="main-menu-action__label">${action.label}</span>
        <span class="main-menu-action__signal" aria-hidden="true"><b></b><b></b><b></b></span>
      `;
      button.addEventListener('mouseenter', () => select(index, false));
      button.addEventListener('focus', () => select(index, false));
      return button;
    }));
    select(0, false);
  }

  function getButtons() {
    return Array.from(root.querySelectorAll('[data-menu-action]'));
  }

  function select(index, moveFocus) {
    const buttons = getButtons();
    if (!buttons.length) return;
    selectedIndex = (index + buttons.length) % buttons.length;
    buttons.forEach((button, buttonIndex) => {
      const selected = buttonIndex === selectedIndex;
      button.classList.toggle('is-selected', selected);
      if (selected) {
        button.setAttribute('aria-current', 'true');
      } else {
        button.removeAttribute('aria-current');
      }
    });
    if (moveFocus) buttons[selectedIndex].focus({ preventScroll: true });
  }

  function isMenuVisible() {
    const menu = document.getElementById('main-menu');
    return menu && !menu.classList.contains('hidden');
  }

  document.addEventListener('keydown', event => {
    if (!isMenuVisible()) return;
    if (event.key === 'ArrowDown') {
      select(selectedIndex + 1, true);
    } else if (event.key === 'ArrowUp') {
      select(selectedIndex - 1, true);
    } else if (event.key === 'Home') {
      select(0, true);
    } else if (event.key === 'End') {
      select(actions.length - 1, true);
    } else if (event.key === 'Enter' || event.key === ' ') {
      getButtons()[selectedIndex]?.click();
    } else {
      return;
    }
    event.preventDefault();
  });

  render();
  window.CellQuestMainMenu = { actions, select };
})();
