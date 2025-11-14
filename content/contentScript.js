const MENU_CONTAINER_ID = 'quick-add-calendar-menu';
let menuItems = [];
let menuElement;

function createMenuElement() {
  if (menuElement) {
    return menuElement;
  }
  const container = document.createElement('div');
  container.id = MENU_CONTAINER_ID;
  container.className = 'quick-add-menu hidden';
  container.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
  document.body.appendChild(container);
  menuElement = container;
  return container;
}

function renderMenuItems() {
  const container = createMenuElement();
  container.innerHTML = '';

  if (!Array.isArray(menuItems) || menuItems.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'quick-add-menu__empty';
    empty.textContent = 'メニューを追加してください';
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'quick-add-menu__list';
  menuItems.forEach((label) => {
    const item = document.createElement('li');
    item.className = 'quick-add-menu__item';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-add-menu__button';
    button.textContent = label;
    button.addEventListener('click', () => {
      hideMenu();
      handleMenuSelection(label);
    });
    item.appendChild(button);
    list.appendChild(item);
  });
  container.appendChild(list);
}

function showMenu(x, y) {
  const container = createMenuElement();
  container.classList.remove('hidden');
  container.style.left = `${x}px`;
  container.style.top = `${y}px`;

  const rect = container.getBoundingClientRect();
  const maxX = window.scrollX + window.innerWidth;
  const maxY = window.scrollY + window.innerHeight;

  if (rect.right > maxX) {
    container.style.left = `${Math.max(0, maxX - rect.width)}px`;
  }
  if (rect.bottom > maxY) {
    container.style.top = `${Math.max(0, maxY - rect.height)}px`;
  }
}

function hideMenu() {
  if (!menuElement) {
    return;
  }
  menuElement.classList.add('hidden');
}

function isClickInsideMenu(event) {
  return menuElement && menuElement.contains(event.target);
}

async function handleMenuSelection(label) {
  try {
    await openCreateDialog(label);
  } catch (error) {
    console.error('Failed to prepare Google Calendar event dialog', error);
  }
}

function waitForElement(selectors, timeout = 5000) {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];

  return new Promise((resolve) => {
    const locate = () => {
      for (const selector of selectorList) {
        const candidate = document.querySelector(selector);
        if (candidate) {
          return candidate;
        }
      }
      return null;
    };

    const existing = locate();
    if (existing) {
      resolve(existing);
      return;
    }

    let timerId;
    const observer = new MutationObserver(() => {
      const candidate = locate();
      if (candidate) {
        observer.disconnect();
        if (timerId) {
          clearTimeout(timerId);
        }
        resolve(candidate);
      }
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    timerId = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

function findCreateButton() {
  const selectors = [
    'div[role="button"][aria-label^="Create"]',
    'div[role="button"][aria-label^="作成"]',
    'button[aria-label^="Create"]',
    'button[aria-label^="作成"]'
  ];
  for (const selector of selectors) {
    const button = document.querySelector(selector);
    if (button) {
      return button;
    }
  }
  return null;
}

function findTitleInput() {
  const selectors = [
    'input[aria-label="Title"]',
    'input[aria-label="Add title"]',
    'input[aria-label="タイトル"]',
    'input[aria-label="タイトルを追加"]'
  ];
  for (const selector of selectors) {
    const input = document.querySelector(selector);
    if (input) {
      return input;
    }
  }
  return null;
}

async function openCreateDialog(defaultTitle) {
  let input = findTitleInput();
  if (!input) {
    const createButton = findCreateButton();
    if (createButton) {
      createButton.click();
    }
    input = await waitForTitleInput();
  }

  if (!input) {
    console.warn('Quick Add: failed to locate Google Calendar title input');
    const editUrl = new URL('/calendar/u/0/r/eventedit', window.location.origin);
    editUrl.searchParams.set('text', defaultTitle);
    window.open(editUrl.toString(), '_blank', 'noopener,noreferrer');
    return;
  }

  input.value = defaultTitle;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.focus();
  const length = defaultTitle.length;
  try {
    input.setSelectionRange(length, length);
  } catch (error) {
    // ignore inability to select text programmatically
  }
}

function waitForTitleInput(timeout = 5000) {
  const selectors = [
    'input[aria-label="Title"]',
    'input[aria-label="Add title"]',
    'input[aria-label="タイトル"]',
    'input[aria-label="タイトルを追加"]'
  ];
  return waitForElement(selectors, timeout);
}

function shouldHandleContextMenu(event) {
  if (!event.target) {
    return false;
  }
  if (isClickInsideMenu(event)) {
    return false;
  }
  const calendarArea = event.target.closest(
    '[role="grid"], [data-dragsource-type="time-grid"], [data-view-label], [data-viewtype], .tEhMVd'
  );
  return Boolean(calendarArea);
}

function loadMenuItems() {
  chrome.storage.sync.get({ quickAddMenuItems: [] }, (result) => {
    menuItems = Array.isArray(result.quickAddMenuItems) ? result.quickAddMenuItems : [];
    renderMenuItems();
  });
}

function handleContextMenu(event) {
  if (!shouldHandleContextMenu(event)) {
    hideMenu();
    return;
  }
  event.preventDefault();
  renderMenuItems();
  showMenu(event.pageX, event.pageY);
}

function bindEvents() {
  document.addEventListener('contextmenu', handleContextMenu, true);
  document.addEventListener('click', (event) => {
    if (!isClickInsideMenu(event)) {
      hideMenu();
    }
  });
  document.addEventListener('scroll', hideMenu, true);
  window.addEventListener('blur', hideMenu);
  window.addEventListener('resize', hideMenu);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideMenu();
    }
  });
}

function init() {
  createMenuElement();
  loadMenuItems();
  bindEvents();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.quickAddMenuItems) {
      menuItems = Array.isArray(changes.quickAddMenuItems.newValue)
        ? changes.quickAddMenuItems.newValue
        : [];
      renderMenuItems();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
