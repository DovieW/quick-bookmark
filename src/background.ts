// src/background.ts
chrome.runtime.onInstalled.addListener(() => {
  console.log('Quick Bookmark Extension installed!');
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'quick-open') {
    // 1) Set mode=open in storage
    await chrome.storage.session.set({ quickMode: 'open' });

    // 2) Open the same default popup
    chrome.action.openPopup();
  }
  // If needed, you could also listen for "_execute_action" to explicitly set "bookmark" mode.
  // But Chrome automatically opens the default_popup for _execute_action. 
  // We'll handle the fallback logic in the popup itself.
});
