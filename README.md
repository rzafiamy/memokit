<div align="center">

<img src="src/icons/icon128.png" alt="MemoKit logo" width="96" height="96">

# MemoKit

**Your browser workspace, restored every time.**

MemoKit is a lightweight Chrome extension that reopens a fixed set of tabs at startup,
keeps your window clean, and lets you switch between saved tab profiles in one click.

[![Version](https://img.shields.io/badge/Version-1.3.0-6366f1.svg)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-a855f7.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-22d3ee.svg)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](package.json)

[Features](#features) ·
[Installation](#installation) ·
[Usage](#usage) ·
[Privacy](#privacy--permissions) ·
[Development](#development) ·
[Releasing](#releasing-an-update)

</div>

---

## Features

Built for people who juggle dozens of sites every day: admin panels, monitoring, Git forges, AI tools, and docs.

| | |
|---|---|
| **Instant launcher** | Press <kbd>Alt</kbd>+<kbd>M</kbd> and type: one search covers profiles and every site in them. Use the keyboard (<kbd>↑</kbd> <kbd>↓</kbd> <kbd>↵</kbd>) or the mouse. |
| **No duplicate tabs** | Opening a site that is already open switches to its tab, in any window. |
| **Tab profiles** | Group sites (Infra, Monitoring, Git, AI…) with a color. Each profile shows how many of its sites are open. |
| **3 ways to open a profile** | **Replace** the window, open in a **new window** (<kbd>⇧↵</kbd>), or **add** the missing tabs (<kbd>Ctrl↵</kbd>). Choose the default in Settings. |
| **Safe switching** | Replace never closes pinned tabs and keeps profile tabs that are already open (no reload, no lost session). Closed tabs can be restored with **Undo** (<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>). |
| **Address bar** | Type <kbd>mk</kbd> <kbd>Space</kbd> `proxmox` then <kbd>↵</kbd> (<kbd>Alt</kbd>+<kbd>↵</kbd> opens in a new window). |
| **Startup restore** | Reopens your fixed startup tabs when the browser starts. Optional auto-cleanup of other tabs. |
| **Quick capture** | Save the current window as a profile or as your startup list in one click. |
| **Backup & restore** | Export all settings to JSON and import them on any machine. |
| **Built for stability** | Startup delays and sequential tab operations designed for Linux / Snap Chromium. See [docs/DEVELOPMENT_RULES.md](docs/DEVELOPMENT_RULES.md). |

Works with Chrome, Chromium, Edge, Brave, and other Chromium-based browsers.

## Installation

### From a release (recommended)

1. Download `memokit-vX.Y.Z.zip` from the [Releases](https://github.com/rzafiamy/memokit/releases) page and unzip it.
2. Open `chrome://extensions/` and enable **Developer mode**.
3. Click **Load unpacked** and select the unzipped folder.

### From source

```bash
git clone https://github.com/rzafiamy/memokit.git
```

Then **Load unpacked** and select the **`src/`** folder (no build needed), or run `npm run build` and select **`dist/`**.

> [!IMPORTANT]
> **Upgrading from v1.2.0 or earlier?** Older versions were loaded from the repository root. Chrome links
> an unpacked extension's data to its folder, so open **Options → System Settings → Export** *before*
> switching to `src/`, then **Import** the backup in the new install.

## Usage

### Popup (<kbd>Alt</kbd>+<kbd>M</kbd>)

The search field has focus as soon as the popup opens:

| Key | Action |
|---|---|
| type | Filter profiles and sites (all words must match: `pve 2`) |
| <kbd>↑</kbd> <kbd>↓</kbd> | Move the selection |
| <kbd>↵</kbd> | Open the selection with the default mode (or switch to the site's tab if it is already open) |
| <kbd>⇧</kbd>+<kbd>↵</kbd> | Open in a new window |
| <kbd>Ctrl</kbd>+<kbd>↵</kbd> | Add to the current window |
| <kbd>Esc</kbd> | Clear the search |

Hover a profile to use the per-profile buttons (new window / add / replace). The toolbar has four buttons:
**Save window** (as a profile), **Startup** (reopen startup tabs), **Set startup** (use this window as the startup list),
and **Close others** (pinned tabs are kept).

### Options page

- **Tab Profiles**: create, edit (color, URLs one per line, *Use tabs of this window*), duplicate, filter, and open.
- **Startup Tabs**: add, edit, pin, remove, and drag-and-drop to reorder.
- **System Settings**: default profile action, keyboard shortcuts, auto-cleanup, and JSON export/import.
- **About**: version, and the persisted error log for troubleshooting.

Shortcuts can be changed at `chrome://extensions/shortcuts`.

## Privacy & permissions

MemoKit has **no servers, no analytics, and no network requests** of its own. Your data stays on your machine.

| Permission | Why |
|---|---|
| `storage` | Saves your startup tabs, profiles, and settings in `chrome.storage.local` (never synced). |
| `host_permissions: <all_urls>` | Reads tab URLs so it can tell which startup tabs are already open. It is used instead of the `tabs` permission, which crashes some Snap Chromium builds. |

## Development

**Requirements:** Node.js 18+ and the `zip` command. There are no npm dependencies, so `npm install` is optional.

```bash
npm run check     # validate src/: version sync, missing file references, JS syntax
npm test          # unit tests (node --test)
npm run build     # check + copy src/ -> dist/ (loadable with "Load unpacked")
npm run package   # build + release/memokit-vX.Y.Z.zip
npm run release   # check + test + package
npm run icons     # re-render src/icons/*.png from assets/*.svg (needs Chrome/Chromium)
npm run clean     # remove dist/ and release/
```

After changing files in `src/`, click ⟳ on the MemoKit card in `chrome://extensions/`.
Read [docs/DEVELOPMENT_RULES.md](docs/DEVELOPMENT_RULES.md) before changing permissions or timing values.

### Project structure

```
src/                        Extension root (load this folder unpacked)
├── manifest.json
├── background/
│   └── service-worker.js   Startup restore, profile switching, message handlers
├── popup/                  Toolbar popup
├── options/                Settings dashboard
├── shared/                 ES modules shared by all contexts
│   ├── constants.js        Storage keys, message actions, timings, defaults
│   ├── storage.js          All chrome.storage.local access
│   ├── messages.js         UI -> service worker messages
│   ├── logger.js           Console and persisted error log
│   ├── url.js              URL normalization and validation
│   ├── utils.js            sleep, escapeHtml
│   └── dialog.{js,css}     In-page alert/confirm dialog
└── icons/                  Generated PNGs (do not edit by hand)
assets/                     Logo sources (SVG)
scripts/                    Build tooling (plain Node, no dependencies)
tests/                      Unit tests
docs/                       Developer documentation
```

## Releasing an update

The version is set only in `package.json`. `npm version` copies it into `src/manifest.json` and this README:

```bash
npm version patch         # or minor / major: bumps, syncs, commits, and tags
# write the release notes in CHANGELOG.md
npm run release           # -> release/memokit-vX.Y.Z.zip
git push --follow-tags
```

Then upload the zip to the Chrome Web Store dashboard or attach it to a GitHub release.

## Contributing

Issues and pull requests are welcome. Before you open a PR:

1. Run `npm run release`. It must pass.
2. Add your change under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).
3. Test the extension manually with **Load unpacked** on `src/`.

## Credits

See [CREDITS.md](CREDITS.md).

## License

Released under the [MIT License](LICENSE). © 2026 rzl
