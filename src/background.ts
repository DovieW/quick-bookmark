chrome.runtime.onInstalled.addListener(() => {
  console.log('Quick Bookmark Extension installed!');
});

// You could listen for commands here if you didn’t rely on default_action:
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-quick-bookmark') {
    // Possibly do something, or rely on the default action opening the popup
  }
});
