const MENU_CONTAINER_ID = 'quick-add-calendar-menu';
const LOADING_OVERLAY_ID = 'quick-add-loading';
const MENU_VIEWPORT_PADDING = 12;

let menuItems = [];
let menuElement;
let loadingElement;
let lastContextEvent = null;

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
  const padding = MENU_VIEWPORT_PADDING;
  const scrollLeft = window.scrollX;
  const scrollTop = window.scrollY;
  const minLeft = scrollLeft + padding;
  const minTop = scrollTop + padding;
  const maxLeft = scrollLeft + window.innerWidth - rect.width - padding;
  const maxTop = scrollTop + window.innerHeight - rect.height - padding;

  let adjustedLeft = x;
  let adjustedTop = y;

  if (rect.width + padding * 2 > window.innerWidth) {
    adjustedLeft = scrollLeft + padding;
  } else {
    adjustedLeft = Math.min(Math.max(adjustedLeft, minLeft), maxLeft);
  }

  if (rect.height + padding * 2 > window.innerHeight) {
    adjustedTop = scrollTop + padding;
  } else {
    adjustedTop = Math.min(Math.max(adjustedTop, minTop), maxTop);
  }

  container.style.left = `${adjustedLeft}px`;
  container.style.top = `${adjustedTop}px`;
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

function createLoadingElement() {
  if (loadingElement) {
    return loadingElement;
  }
  const overlay = document.createElement('div');
  overlay.id = LOADING_OVERLAY_ID;
  overlay.className = 'quick-add-loading hidden';
  overlay.setAttribute('aria-hidden', 'true');

  const spinner = document.createElement('div');
  spinner.className = 'quick-add-loading__spinner';
  overlay.appendChild(spinner);

  document.body.appendChild(overlay);
  loadingElement = overlay;
  return overlay;
}

function showLoadingIndicator() {
  const overlay = createLoadingElement();
  overlay.classList.remove('hidden');
}

function hideLoadingIndicator() {
  if (!loadingElement) {
    return;
  }
  loadingElement.classList.add('hidden');
}

async function handleMenuSelection(label) {
  try {
    showLoadingIndicator();
    const context = lastContextEvent;
    lastContextEvent = null;
    await openCreateDialog(label, context);
  } catch (error) {
    console.error('Failed to prepare Google Calendar event dialog', error);
  } finally {
    hideLoadingIndicator();
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

function simulatePrimaryClick(target, { clientX, clientY }) {
  if (!target) {
    return;
  }
  const baseOptions = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX,
    clientY,
    button: 0,
    buttons: 1
  };
  if (window.PointerEvent) {
    const pointerOptions = {
      ...baseOptions,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true
    };
    target.dispatchEvent(new PointerEvent('pointerdown', pointerOptions));
    target.dispatchEvent(new PointerEvent('pointerup', pointerOptions));
  }
  target.dispatchEvent(new MouseEvent('mousedown', baseOptions));
  target.dispatchEvent(new MouseEvent('mouseup', baseOptions));
  target.dispatchEvent(new MouseEvent('click', baseOptions));
}

function triggerInlineEditor(context) {
  if (!context) {
    return;
  }
  const { clientX, clientY, target } = context;
  let candidate = null;
  if (target instanceof Element) {
    candidate = target.closest('[role="gridcell"], [data-dragsource-type="time-grid"], .tEhMVd, .lFe10d');
  }
  if (!candidate) {
    candidate = document.elementFromPoint(clientX, clientY);
  }
  if (!candidate || !(candidate instanceof Element)) {
    return;
  }
  if (typeof candidate.focus === 'function') {
    try {
      candidate.focus({ preventScroll: true });
    } catch (error) {
      // ignore inability to focus
    }
  }
  simulatePrimaryClick(candidate, { clientX, clientY });
}

async function prepareEventInput(context) {
  let input = findTitleInput();
  if (input) {
    return input;
  }

  triggerInlineEditor(context);
  input = await waitForTitleInput(2500);
  if (input) {
    return input;
  }

  const createButton = findCreateButton();
  if (createButton) {
    createButton.click();
    input = await waitForTitleInput(3000);
    if (input) {
      return input;
    }
  }

  return findTitleInput();
}

async function openCreateDialog(defaultTitle, context) {
  const input = await prepareEventInput(context);

  if (!input) {
    console.warn('Quick Add: failed to locate Google Calendar title input');
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
  lastContextEvent = {
    target: event.target,
    clientX: event.clientX,
    clientY: event.clientY
  };
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
