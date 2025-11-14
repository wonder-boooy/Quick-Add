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

    const textElement = document.createElement('p');
    textElement.className = 'menu-list__label';
    textElement.textContent = label;

    const actionContainer = document.createElement('div');
    actionContainer.className = 'menu-list__actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'menu-list__button';
    editButton.textContent = '編集';
    editButton.addEventListener('click', () => handleEdit(index));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'menu-list__button';
    deleteButton.textContent = '削除';
    deleteButton.addEventListener('click', () => handleDelete(index));

    actionContainer.appendChild(editButton);
    actionContainer.appendChild(deleteButton);

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

loadMenuItems();
