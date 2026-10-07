Quick Bookmark 4.0.0 introduces a clearer, roomier popup and more predictable search and playlist actions.

### What's new

- Larger text, buttons, and icons, with neutral charcoal colors, more space between rows, and simpler selection styling.
- Save, Open, and Playlists share one header. Keyboard hints, result counts, aligned margins, and an inset scrollbar make the picker easier to use.
- A new Settings page offers URL and domain matching. It is **off by default**; bookmark search continues to match titles until you enable it.
- Frequently used bookmark folders appear first, with recent use breaking ties. Search queries still use text relevance, and empty folders are included.
- Keyboard navigation reuses result rows and updates selection immediately. Independent startup reads run in parallel.
- YouTube playlists show current membership and offer explicit **Add** or **Remove** actions. Failed membership checks offer a read-only **Retry**.
- Playlist changes preserve your chosen action after a fresh membership check. Repeated Enter presses cannot submit the same action twice.
- Membership queries filter by video ID, and playlist count updates no longer extend stale cache lifetimes.
- Build and ZIP packaging fixes, shared picker code, and automated application and browser checks.

### Downloads

- **quick-bookmark-4.0.0.zip**: the extension package for Chrome Web Store upload, or extract it and load the folder through `chrome://extensions` → Developer mode → Load unpacked.
- **quick-bookmark-4.0.0-publishing-kit.zip**: the upload ZIP, store description, update notes, permission explanations, reviewer instructions, updated images, and a publication guide. Extract this kit; upload the enclosed extension ZIP as the package.
- **SHA256SUMS.txt**: checksums for both archives.

No new extension permissions are requested. Existing bookmarks do not require migration. YouTube account access remains optional, and bookmark search and saving work without it.

Validation: TypeScript, 12 unit tests, 10 browser tests, real packaged-extension settings/bookmark flows, and ZIP integrity checks. YouTube behavior uses mocked API responses; live Google authorization and account changes were not exercised.
