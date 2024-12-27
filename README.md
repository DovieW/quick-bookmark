Quick Bookmark
A simple Chrome extension built with Vite, React, and Material UI to quickly bookmark the current page into a folder via fuzzy search.

Features
Keyboard Shortcut: Press Ctrl+D (or whichever shortcut you configure) to open the popup.
Fuzzy Folder Search: Start typing a folder name to quickly locate where you want to drop your new bookmark.
Single Press: Press Enter to create the bookmark in the top matching folder.
Requirements
Node.js (v14+ recommended)
Google Chrome (latest version recommended)
Installation & Development
Clone the repository:

bash
Copy code
git clone https://github.com/yourusername/quick-bookmark-extension.git
cd quick-bookmark-extension
Install dependencies:

bash
Copy code
npm install
Start development server:

bash
Copy code
npm run dev
This will start Vite’s development server. However, since this is a Chrome Extension, you can’t load it directly like a normal web application. Instead, you’ll bundle and load into Chrome:

Build the extension:

bash
Copy code
npm run build
This produces a dist/ folder containing your extension files (including manifest.json, background.js, popup.html, etc.).

Load the extension into Chrome:

Open chrome://extensions in your browser.
Enable Developer mode (toggle in the top-right corner).
Click Load unpacked.
Select the dist folder of this project.
Test:

Click the extension icon or use the assigned keyboard shortcut (default: Ctrl+D if Chrome allows).
Type the folder name you want to add a bookmark to.
Press Enter to create the bookmark in the first folder result or click on a folder in the list.
Customizing the Keyboard Shortcut
Chrome may not allow overriding default browser shortcuts like Ctrl+D.
To change or view the shortcut:
Go to chrome://extensions/shortcuts.
Find “Quick Bookmark” in the list.
Set a custom shortcut (e.g., Alt+Shift+K).
Contributing
Feel free to open issues or pull requests on GitHub if you find bugs or want additional features!
License
GPLv3