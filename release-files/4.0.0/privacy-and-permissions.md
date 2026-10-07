# Chrome Web Store privacy fields

## Single purpose

Help users save and find pages quickly through bookmark search and folder selection, with optional saving of the current YouTube video to their playlists.

## Permission explanations

| Permission | Text to use |
| --- | --- |
| `bookmarks` | Read the user's bookmark folders and bookmarks for local fuzzy search, create a bookmark in the selected folder, and open Chrome's bookmark manager for that folder. |
| `tabs` | Read the active tab's URL and title for bookmarking and supported YouTube video detection. Open or update tabs only when the user selects a bookmark or a bookmark-manager action. |
| `tabGroups` | When the user opens a bookmark in an adjacent tab, keep the new tab in the current tab's group. |
| `storage` | Store local preferences, popup mode, folder-use counts and timestamps, YouTube playlist caches, the last-used playlist, and a cached YouTube access token. |
| `identity` | Obtain and invalidate Google OAuth authorization through Chrome's identity API, only for the optional YouTube playlist feature. |
| `https://www.googleapis.com/*` | Call the YouTube Data API to list the connected user's playlists, check membership of the current video, and add or remove a video when the user requests that action. |
| `https://oauth2.googleapis.com/*` and `https://accounts.google.com/*` | Google authorization hosts included in the existing YouTube integration. OAuth authorization is obtained through Chrome's identity API; the extension does not read Google account pages or run scripts on them. |

The 4.0.0 permission and host-permission lists match 3.0.1. The existing YouTube OAuth scope is `https://www.googleapis.com/auth/youtube`.

## Remote code

Select **No, I am not using remote code**. JavaScript, CSS, and search code are bundled in the extension. Google's YouTube API returns data; it is not executable code.

## Data-use disclosure

Use the following implemented behavior when completing or updating the data-use checkboxes:

- Current-tab URLs, bookmark URLs, and titles are accessed to save and find bookmarks. The extension does not query Chrome's browsing-history API.
- Optional YouTube authorization uses an OAuth access token. A copy is cached in local Chrome storage and sent only to Google's YouTube APIs.
- Playlist titles, descriptions, counts, and video membership are accessed for the optional playlist feature. Playlist metadata and last-used preferences are cached locally.
- Search settings, folder-use counts, and last-used times stay in local Chrome storage.
- There is no developer-owned collection server, analytics, advertising, sale of data, creditworthiness use, or transfer for unrelated purposes.

The relevant dashboard categories to review are **Authentication information** (optional Google OAuth token), **Web history** (active-page and bookmark URLs), and **Website content** (titles and playlist metadata). Disclose the access and use described above consistently with the privacy policy; the absence of analytics does not mean the extension never handles user data.

Privacy policy URL:

https://raw.githubusercontent.com/DovieW/quick-bookmark/master/PRIVACY.md

Project URL: https://github.com/DovieW/quick-bookmark

Support URL: https://github.com/DovieW/quick-bookmark/issues

Google's field guidance: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
