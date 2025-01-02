chrome.runtime.onInstalled.addListener(() => {
  console.log('Quick Bookmark Extension installed!');
});

// Listen for commands
chrome.commands.onCommand.addListener((command) => {
  if (command === 'quick-open') {
    // Programmatically open open.html in a small popup window
    chrome.windows.create({
      url: chrome.runtime.getURL('open.html'),
      type: 'popup',
      width: 400,
      height: 500,
      top: 100,
      left: 100
    });
  }
});
