Quick Bookmark 4.1.0 brings a compact popup and more predictable search.

### What’s new

- Redesigned Save, Open, and Playlists as a compact charcoal command palette with blue selection, tighter rows, smaller controls, and keyboard hints.
- Simplified the header, added the current page title to Save, and reduced repetitive folder paths while retaining full-path tooltips.
- Moved YouTube Reconnect and Refresh into a keyboard-accessible playlist actions menu.
- Sized the results viewport to complete rows and clarified the Open folder action.
- Replaced phrase-based fuzzy search with word matching anywhere, in any order, across the allowed fields. Every query word must match.
- Ranked exact names first, followed by title words and prefixes, substrings, parent-path matches, and modest typo matches. Folder usage breaks relevance ties.
- Added matching highlights with accent-aware original text positions, and kept URL/domain matching off by default.
- Added search and browser regression coverage and removed the unused Fuse.js dependency.

### Downloads

- **quick-bookmark-4.1.0.zip**: extension package for Chrome Web Store upload, or extract and load through Chrome’s Load unpacked control.
- **quick-bookmark-4.1.0-publishing-kit.zip**: extension ZIP, store copy, reviewer instructions, updated images, and publication guide. Extract the kit before uploading the enclosed extension ZIP.
- **SHA256SUMS.txt**: checksums for both archives.

No new extension permissions or bookmark migrations are required. YouTube access remains optional.

Validation: TypeScript, 20 unit tests, 11 browser tests including packaged-extension flows, and archive checks. YouTube tests and screenshots use mocked responses; live Google authorization and account changes were not tested. GitHub publication does not submit the update to the Chrome Web Store.
