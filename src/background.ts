// src/background.ts
chrome.runtime.onInstalled.addListener(() => {
  console.log('Quick Bookmark Extension installed!');
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open') {
    await chrome.storage.local.set({ quickMode: 'open' });

    chrome.action.openPopup();
  } else if (command === 'add') {
    await chrome.storage.local.set({ quickMode: 'add' });

    chrome.action.openPopup();
  }
});
