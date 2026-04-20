# Quick Bookmark

<img align="right" src="https://i.imgur.com/XkaDJnv.png" width="400px">

Quickly bookmark a page or open a bookmarked page via fuzzy search.

- `Ctrl + D` to bookmark a page.
- `Alt + F` to open a bookmarked page (`Ctrl + Enter` to open in new tab and `Ctrl + Shift + Enter` to open in new tab at end of all tabs).
- On a supported YouTube video page, `Ctrl + D` opens a YouTube playlist picker instead of the folder picker.
- While the popup is open on a YouTube video, pressing `Ctrl + D` again toggles between playlist mode and the normal bookmark-folder mode.

May have to set shortcuts manually in Chrome extension settings: `chrome://extensions/shortcuts`

## YouTube playlist setup

### For normal users

You do **not** need an options page just to sign in.

The intended auth flow is:

1. Open a YouTube video page.
2. Press `Ctrl + D`.
3. Click **Connect YouTube** in the playlist picker.
4. Sign in to Google and approve access.
5. Pick a playlist.

After that, the extension can load your playlists and toggle the current video in or out of them.

### For the developer / unpacked build

To enable the YouTube playlist feature for real playlists on your account during development:

1. Create a Chrome Extension OAuth client in Google Cloud for this extension.
2. Put the client ID into `.env` as `VITE_YOUTUBE_CLIENT_ID`.
3. Optional but recommended: add your extension public key as `VITE_EXTENSION_KEY` so the unpacked extension keeps a stable ID.
4. Rebuild the extension and reload it in Chrome.

If YouTube OAuth is not configured yet, the playlist picker will show a setup prompt instead of failing mysteriously.

## Do we need an options page?

Probably not for the first version.

Users should not need to enter a client ID, secret, or any Google Cloud settings themselves. Those values should be baked into the shipped extension build.

An options page would only be helpful later for nice-to-have account controls such as:

- showing whether YouTube is connected
- disconnecting / reconnecting the Google account
- clearing cached playlists
- choosing a default playlist behavior

So: **not required for auth**, but potentially useful later for account management.

[Chrome Store](https://chromewebstore.google.com/detail/quick-bookmark/diadedbbnkkjdmldbnfiohjomifmghbi)
