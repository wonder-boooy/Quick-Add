const DEFAULT_MENU_ITEMS = [
  '【開発】',
  '【レビュー】',
  '【CS】',
  '【MTG】',
  '【業務改善】',
  '【採用】',
  '【Help】',
  '【調査】',
  '【その他】'
];

const listElement = document.getElementById('menu-list');
const formElement = document.getElementById('add-form');
const inputElement = document.getElementById('menu-input');

let menuItems = [];
let dragSourceIndex = null;

function clearDragState() {
  dragSourceIndex = null;
  listElement.classList.remove('menu-list--dragging');
  const dragged = listElement.querySelectorAll('.menu-list__item');
  dragged.forEach((element) => {
    element.classList.remove(
      'menu-list__item--dragging',
      'menu-list__item--dragover',
      'menu-list__item--drop-before',
      'menu-list__item--drop-after'
    );
    if (element instanceof HTMLElement) {
      element.setAttribute('aria-grabbed', 'false');
      delete element.dataset.dropPosition;
    }
  });
}

function handleDragStart(event) {
  const item = event.currentTarget;
  if (!(item instanceof HTMLElement)) {
    return;
  }
  dragSourceIndex = Number.parseInt(item.dataset.index ?? '', 10);
  if (Number.isNaN(dragSourceIndex)) {
    dragSourceIndex = null;
    return;
  }
  listElement.classList.add('menu-list--dragging');
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
    event.dataTransfer.setData('text/plain', String(dragSourceIndex));
  }
  item.setAttribute('aria-grabbed', 'true');
  requestAnimationFrame(() => {
    item.classList.add('menu-list__item--dragging');
  });
}

function handleDragOver(event) {
  event.preventDefault();
  const item = event.currentTarget;
  if (!(item instanceof HTMLElement)) {
    return;
  }
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  if (!item.classList.contains('menu-list__item')) {
    return;
  }
  listElement
    .querySelectorAll('.menu-list__item--dragover')
    .forEach((element) => {
      element.classList.remove(
        'menu-list__item--dragover',
        'menu-list__item--drop-before',
        'menu-list__item--drop-after'
      );
      if (element instanceof HTMLElement) {
        delete element.dataset.dropPosition;
      }
    });
  const rect = item.getBoundingClientRect();
  const isAfter = event.clientY > rect.top + rect.height / 2;
  item.classList.add('menu-list__item--dragover');
  item.classList.toggle('menu-list__item--drop-after', isAfter);
  item.classList.toggle('menu-list__item--drop-before', !isAfter);
  item.dataset.dropPosition = isAfter ? 'after' : 'before';
}

function handleDragLeave(event) {
  const item = event.currentTarget;
  if (item instanceof HTMLElement) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof HTMLElement && item.contains(nextTarget)) {
      return;
    }
    item.classList.remove(
      'menu-list__item--dragover',
      'menu-list__item--drop-before',
      'menu-list__item--drop-after'
    );
    delete item.dataset.dropPosition;
  }
}

function handleDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) {
    clearDragState();
    return;
  }
  const targetIndex = Number.parseInt(target.dataset.index ?? '', 10);
  if (Number.isNaN(targetIndex) || dragSourceIndex === null) {
    clearDragState();
    return;
  }
  const dropPosition = target.dataset.dropPosition === 'after' ? 'after' : 'before';
  target.classList.remove(
    'menu-list__item--dragover',
    'menu-list__item--drop-before',
    'menu-list__item--drop-after'
  );
  delete target.dataset.dropPosition;
  if (targetIndex === dragSourceIndex && dropPosition === 'before') {
    clearDragState();
    return;
  }

  const [moved] = menuItems.splice(dragSourceIndex, 1);
  let destinationIndex = targetIndex;
  if (dragSourceIndex < targetIndex) {
    destinationIndex -= 1;
  }
  if (dropPosition === 'after') {
    destinationIndex += 1;
  }
  if (destinationIndex < 0) {
    destinationIndex = 0;
  }
  if (destinationIndex > menuItems.length) {
    destinationIndex = menuItems.length;
  }
  menuItems.splice(destinationIndex, 0, moved);
  clearDragState();
  renderMenu();
  saveMenuItems();
}

function handleDragEnd() {
  clearDragState();
}

function handleListDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  if (dragSourceIndex === null) {
    clearDragState();
    return;
  }
  const [moved] = menuItems.splice(dragSourceIndex, 1);
  menuItems.push(moved);
  clearDragState();
  renderMenu();
  saveMenuItems();
}

function renderMenu() {
  listElement.innerHTML = '';

  if (!menuItems.length) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'menu-list__empty';
    emptyItem.textContent = 'メニューがありません。追加してください。';
    listElement.appendChild(emptyItem);
    return;
  }

  menuItems.forEach((label, index) => {
    const itemElement = document.createElement('li');
    itemElement.className = 'menu-list__item';
    itemElement.dataset.index = String(index);
    itemElement.setAttribute('draggable', 'true');
    itemElement.setAttribute('aria-grabbed', 'false');
    itemElement.addEventListener('dragstart', handleDragStart);
    itemElement.addEventListener('dragover', handleDragOver);
    itemElement.addEventListener('dragleave', handleDragLeave);
    itemElement.addEventListener('drop', handleDrop);
    itemElement.addEventListener('dragend', handleDragEnd);

    const textElement = document.createElement('p');
    textElement.className = 'menu-list__label';
    textElement.textContent = label;
    textElement.setAttribute('draggable', 'false');

    const handleElement = document.createElement('span');
    handleElement.className = 'menu-list__handle';
    handleElement.setAttribute('aria-hidden', 'true');
    handleElement.setAttribute('title', 'ドラッグで並び替え');
    handleElement.setAttribute('draggable', 'false');
    handleElement.textContent = '⋮⋮';

    const actionContainer = document.createElement('div');
    actionContainer.className = 'menu-list__actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'menu-list__button';
    editButton.textContent = '編集';
    editButton.setAttribute('draggable', 'false');
    editButton.addEventListener('click', () => handleEdit(index));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'menu-list__button';
    deleteButton.textContent = '削除';
    deleteButton.setAttribute('draggable', 'false');
    deleteButton.addEventListener('click', () => handleDelete(index));

    actionContainer.appendChild(editButton);
    actionContainer.appendChild(deleteButton);

    itemElement.appendChild(handleElement);
    itemElement.appendChild(textElement);
    itemElement.appendChild(actionContainer);

    listElement.appendChild(itemElement);
  });
}

function saveMenuItems() {
  chrome.storage.sync.set({ quickAddMenuItems: menuItems });
}

function handleEdit(index) {
  const current = menuItems[index] ?? '';
  const updated = window.prompt('メニュー名を編集', current);
  if (typeof updated !== 'string') {
    return;
  }
  const trimmed = updated.trim();
  if (!trimmed) {
    return;
  }
  menuItems[index] = trimmed;
  renderMenu();
  saveMenuItems();
}

function handleDelete(index) {
  menuItems.splice(index, 1);
  renderMenu();
  saveMenuItems();
}

function handleSubmit(event) {
  event.preventDefault();
  const value = inputElement.value.trim();
  if (!value) {
    return;
  }
  menuItems.push(value);
  inputElement.value = '';
  renderMenu();
  saveMenuItems();
}

function loadMenuItems() {
  chrome.storage.sync.get({ quickAddMenuItems: DEFAULT_MENU_ITEMS }, (result) => {
    const stored = result.quickAddMenuItems;
    menuItems = Array.isArray(stored) && stored.length ? stored : DEFAULT_MENU_ITEMS;
    renderMenu();
  });
}

formElement.addEventListener('submit', handleSubmit);
listElement.addEventListener('dragover', (event) => {
  if (event.target === listElement) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }
});
listElement.addEventListener('drop', (event) => {
  if (event.target === listElement) {
    handleListDrop(event);
  }
});

loadMenuItems();
