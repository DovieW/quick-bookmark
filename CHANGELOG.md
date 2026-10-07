# Changelog

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
