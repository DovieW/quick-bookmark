# Publish Quick Bookmark 4.0.0

GitHub release: https://github.com/DovieW/quick-bookmark/releases/tag/v4.0.0

Existing Chrome Web Store item: https://chromewebstore.google.com/detail/quick-bookmark/diadedbbnkkjdmldbnfiohjomifmghbi

Extension ID: `diadedbbnkkjdmldbnfiohjomifmghbi`.

## Package to upload

Upload **quick-bookmark-4.0.0.zip** from the GitHub release or from inside the extracted publishing kit. This is the extension-only ZIP, with `manifest.json` at its root. The publishing-kit ZIP contains the upload ZIP, these instructions, and store assets; extract it first rather than uploading the kit itself as an extension package.

The package version is 4.0.0. It retains the existing extension ID, Google OAuth configuration, permissions, and host permissions. No bookmark migration is needed. URL and domain search is off by default.

## Store submission

1. Open https://chrome.google.com/webstore/devconsole and select the existing **Quick Bookmark** item with the ID above.
2. On **Package**, choose **Upload New Package** and upload `quick-bookmark-4.0.0.zip`.
3. On **Store listing**, keep the name **Quick Bookmark**. Use `store-description.txt` for the detailed description. `store-summary.txt` is an optional short summary; `whats-new.txt` can be used for announcements or incorporated into the description.
4. Replace outdated screenshots with the four files in `screenshots/`. They are 1280×800 PNGs. `promo-small.png` is a 440×280 promotional tile, and `icon128.png` is the existing 128×128 extension icon. Existing images can be retained if you prefer.
5. Update **Privacy practices** using `privacy-and-permissions.md`. Keep the privacy-policy URL above in that document. The updated policy includes local folder history and cached YouTube authorization.
6. Use `reviewer-instructions.txt` for reviewer notes if requested. Keep the existing distribution settings unless you intend to change them.
7. Save the listing and click **Submit for Review**. Choose whether to publish automatically after approval or publish manually after approval.

Google's current update instructions: https://developer.chrome.com/docs/webstore/update

Google's image requirements: https://developer.chrome.com/docs/webstore/images

This kit prepares the update; GitHub publication does not submit it to the Chrome Web Store.

## Validation and limitations

- TypeScript, 12 unit tests, and 10 browser tests cover defaults, ranking, safe playlist action intent, keyboard scrolling, settings persistence, and packaged-extension behavior.
- The release ZIP is checked for version consistency, required files, portable paths, matching extension ID, and archive integrity.
- The popup layout was checked at 100% and 175% display scale, with a visible scrollbar and without scrolling.
- YouTube API behavior is tested with mocked responses. Live Google OAuth and real account changes were not tested or performed.
- Store screenshots use fictional bookmarks and mocked playlist data.

## Files

- `release-notes.md`: GitHub release notes.
- `store-description.txt`, `store-summary.txt`, `whats-new.txt`: copy for the store and announcements.
- `privacy-and-permissions.md`: purpose, permissions, remote-code declaration, data-handling details, and policy links.
- `reviewer-instructions.txt`: steps to exercise the extension.
- `screenshots/`: four store screenshots.
- `promo-small.png`, `icon128.png`: promotional tile and icon.
- `popup-preview.png`: popup preview for the repository README; use the 1280×800 images for the store.
- `quick-bookmark-4.0.0.zip`: the ready-to-upload extension package, included in the downloaded kit.

Both release archives are accompanied by `SHA256SUMS.txt` on GitHub. Verify downloads with `sha256sum -c SHA256SUMS.txt` after placing both ZIPs and that file in the same folder.
