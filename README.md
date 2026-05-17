# MemoKit 🧠

**MemoKit** is a premium Chrome Extension kit designed for high-productivity environments. It allows you to define a fixed set of tabs that are automatically restored and maintained every time you start your browser.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Version](https://img.shields.io/badge/Version-1.1.0-purple.svg)](https://github.com/rzafiamy/memokit)

## Key Features

- **Automated Workspace Persistence**: Never lose your context again.
- **Background Cleanup**: Automatically removes extra tabs to keep your focus sharp.
- **State Capture**: Easily save your current browser state as your new startup default.
- **Modern Dashboard**: Manage your sites with a sleek, drag-and-drop interface.
- **Manifest V3**: Built on the latest, most secure extension standards.

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/rzafiamy/memokit.git
   ```
2. Open Chrome/Edge/Brave and go to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the cloned folder.

## Configuration

Access the **Options** page by right-clicking the MemoKit icon or through the extension popup. Here you can:
- **Startup Tabs**: Add, Edit, or Remove sites that launch automatically. Reorder tabs via drag-and-drop.
- **Tab Profiles**: Create custom groups of URLs (e.g., Work, Social, News) for quick context switching.
- **Pinning Tabs**: Set specific tabs to be pinned upon startup.
- **Auto-Cleanup**: Toggle automatic closing of any tabs that are not in your fixed list at startup.
- **Backup & Portability**: Export your configuration as a JSON file to easily backup or share your settings, and import them anytime.

## Building for Production

To package the extension for the Chrome Web Store or manual distribution, use the provided deployment script.

1. Make sure the script is executable:
   ```bash
   chmod +x deploy.sh
   ```
2. Run the build script:
   ```bash
   ./deploy.sh
   ```
This will automatically generate a clean `.zip` file in the `dist` directory, appropriately versioned based on your `manifest.json`.

## Development

Developed by **Makix team** from [infodev.ovh](https://infodev.ovh).

- **Lead Developer**: wservice@infodev.ovh
- **Repository**: [rzafiamy/memokit](https://github.com/rzafiamy/memokit)

## License

This project is licensed under the **Apache License 2.0**. See the [LICENSE](LICENSE) file for details.
