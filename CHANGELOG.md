# Changelog

## 4.1.0 — 2026-11-15

- Redesigned Save, Open, and Playlists as a compact charcoal command palette with blue selection, tighter rows, smaller controls, and keyboard hints.
- Simplified the header, added the current page title to Save, and reduced repetitive folder paths while retaining full-path tooltips.
- Moved YouTube Reconnect and Refresh into a keyboard-accessible playlist actions menu.
- Sized the results viewport to complete rows and clarified the Open folder action.
- Replaced phrase-based fuzzy search with word matching anywhere, in any order, across the allowed fields. Every query word must match.
- Ranked exact names first, followed by title words and prefixes, substrings, parent-path matches, and modest typo matches. Folder usage breaks relevance ties.
- Added matching highlights with accent-aware original text positions, and kept URL/domain matching off by default.
- Added search and browser regression coverage and removed the unused Fuse.js dependency.

No new permissions or bookmark migrations are required.

## 4.0.0 — 2026-10-06

- Redesigned the popup with larger text, controls, and icons; roomier rows; neutral charcoal colors; and a restrained green accent.
- Kept Save, Open, and Playlists in a single header and added visible keyboard hints and result counts.
- Aligned the search field and result rows, with an inset scrollbar and a simpler selected-row background.
- Added a Settings page with optional URL and domain matching, off by default. Title-only search remains the default.
- Ranked frequently used bookmark folders first, using recent use to break ties. Empty folders are included.
- Reused result rows during keyboard navigation, removed selection animations, and ran independent startup reads in parallel.
- Replaced ambiguous YouTube playlist toggling with visible membership status and explicit Add, Remove, and read-only Retry actions.
- Rechecked membership before playlist changes while preserving the selected action and preventing repeated submissions.
- Queried YouTube membership by video ID instead of scanning entire playlists, and preserved cache expiry after count updates.
- Consolidated the picker and bookmark traversal code and removed an unused cache implementation.
- Fixed TypeScript build compatibility and cross-platform ZIP packaging, with application, browser, and archive checks.
- Updated the privacy policy to describe local settings, folder usage, and YouTube authorization storage.

No new extension permissions are requested. Existing bookmarks do not require migration.
