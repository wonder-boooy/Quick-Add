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

const dragState = {
  startIndex: null,
  dropIndex: null,
  draggedElement: null,
  placeholder: null,
  dragImage: null,
};

let menuItems = [];
let dropOccurred = false;

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
    itemElement.draggable = true;

    const contentElement = document.createElement('div');
    contentElement.className = 'menu-list__content';

    const handleElement = document.createElement('span');
    handleElement.className = 'menu-list__drag-handle';
    handleElement.setAttribute('aria-hidden', 'true');
    handleElement.textContent = '⋮⋮';

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

    contentElement.appendChild(handleElement);
    contentElement.appendChild(textElement);

    itemElement.appendChild(contentElement);
    itemElement.appendChild(actionContainer);

    itemElement.addEventListener('dragstart', handleDragStart);
    itemElement.addEventListener('dragend', handleDragEnd);

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

listElement.addEventListener('dragenter', (event) => {
  event.preventDefault();
});

listElement.addEventListener('dragover', handleDragOver);
listElement.addEventListener('drop', handleDrop);

loadMenuItems();

function handleDragStart(event) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const index = Number(target.dataset.index ?? '-1');
  if (Number.isNaN(index) || index < 0) {
    return;
  }

  dragState.startIndex = index;
  dragState.dropIndex = index;
  dragState.draggedElement = target;
  dropOccurred = false;

  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', String(index));

  const placeholder = document.createElement('li');
  placeholder.className = 'menu-list__placeholder';
  placeholder.style.height = `${target.offsetHeight}px`;
  dragState.placeholder = placeholder;

  const clone = target.cloneNode(true);
  if (clone instanceof HTMLElement) {
    clone.classList.add('menu-list__drag-preview');
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);
    dragState.dragImage = clone;
    const rect = clone.getBoundingClientRect();
    event.dataTransfer.setDragImage(clone, rect.width / 2, rect.height / 2);
  }

  requestAnimationFrame(() => {
    target.classList.add('menu-list__item--hidden');
    listElement.insertBefore(placeholder, target.nextSibling);
  });
}

function handleDragOver(event) {
  event.preventDefault();
  if (!dragState.placeholder || dragState.startIndex === null) {
    return;
  }

  const afterElement = getDragAfterElement(event.clientY);
  const newDropIndex = afterElement ? Number(afterElement.dataset.index) : menuItems.length;

  if (dragState.dropIndex === newDropIndex) {
    return;
  }

  const previousPositions = captureItemPositions();

  if (!afterElement) {
    listElement.appendChild(dragState.placeholder);
  } else {
    listElement.insertBefore(dragState.placeholder, afterElement);
  }

  dragState.dropIndex = newDropIndex;
  animateReorder(previousPositions);
}

function handleDrop(event) {
  event.preventDefault();
  if (dragState.startIndex === null) {
    return;
  }

  dropOccurred = true;

  const startIndex = dragState.startIndex;
  const rawDropIndex = dragState.dropIndex ?? startIndex;
  const boundedRawIndex = Math.max(0, Math.min(rawDropIndex, menuItems.length));
  let targetIndex = boundedRawIndex;

  if (targetIndex > startIndex) {
    targetIndex -= 1;
  }

  if (targetIndex !== startIndex) {
    const updated = [...menuItems];
    const [moved] = updated.splice(startIndex, 1);
    updated.splice(targetIndex, 0, moved);
    menuItems = updated;
    saveMenuItems();
  }

  renderMenu();
}

function handleDragEnd() {
  cleanupDragArtifacts();
  resetDragState();

  if (!dropOccurred) {
    renderMenu();
  }

  dropOccurred = false;
}

function getDragAfterElement(y) {
  const items = Array.from(
    listElement.querySelectorAll('.menu-list__item:not(.menu-list__item--hidden)')
  );

  return items.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - (box.top + box.height / 2);
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function captureItemPositions() {
  return Array.from(
    listElement.querySelectorAll('.menu-list__item:not(.menu-list__item--hidden)')
  ).map((element) => ({
    element,
    top: element.getBoundingClientRect().top,
  }));
}

function animateReorder(previousPositions) {
  previousPositions.forEach(({ element, top }) => {
    const rect = element.getBoundingClientRect();
    const deltaY = top - rect.top;
    if (!deltaY) {
      return;
    }

    element.style.transition = 'none';
    element.style.transform = `translateY(${deltaY}px)`;

    requestAnimationFrame(() => {
      element.style.transition = 'transform 180ms ease';
      element.style.transform = '';
    });

    const handleTransitionEnd = () => {
      element.style.transition = '';
      element.removeEventListener('transitionend', handleTransitionEnd);
    };

    element.addEventListener('transitionend', handleTransitionEnd);
  });
}

function cleanupDragArtifacts() {
  if (dragState.placeholder?.parentNode) {
    dragState.placeholder.parentNode.removeChild(dragState.placeholder);
  }

  if (dragState.draggedElement) {
    dragState.draggedElement.classList.remove('menu-list__item--hidden');
  }

  if (dragState.dragImage?.parentNode) {
    dragState.dragImage.parentNode.removeChild(dragState.dragImage);
  }
}

function resetDragState() {
  dragState.startIndex = null;
  dragState.dropIndex = null;
  dragState.draggedElement = null;
  dragState.placeholder = null;
  dragState.dragImage = null;
}
