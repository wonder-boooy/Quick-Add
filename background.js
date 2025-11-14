const DEFAULT_MENU_ITEMS = [
  "【開発】",
  "【レビュー】",
  "【CS】",
  "【MTG】",
  "【業務改善】",
  "【採用】",
  "【Help】",
  "【調査】",
  "【その他】"
];

function ensureDefaults() {
  chrome.storage.sync.get({ quickAddMenuItems: null }, (result) => {
    if (!Array.isArray(result.quickAddMenuItems) || result.quickAddMenuItems.length === 0) {
      chrome.storage.sync.set({ quickAddMenuItems: DEFAULT_MENU_ITEMS });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaults();
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaults();
});
