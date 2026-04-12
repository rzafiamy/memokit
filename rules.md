# MemoKit Chrome Extension Development Rules

These rules are derived from solving stability issues on Linux (Snap-based Chromium) and reflect best practices for "Unpacked" extension development.

## 🛠 Stability Rules (Crucial for Linux/Snap)

1.  **Bypass Privilege Crashes**: 
    *   Avoid the explicit `"permissions": ["tabs"]` in the manifest if the extension causes boot crashes.
    *   **Fix**: Use `"host_permissions": ["<all_urls>"]` instead. This provides tab URL access without triggering the high-privacy sandbox flags that crash Snap containers.

2.  **Storage Engine Choice**: 
    *   Avoid `chrome.storage.sync` in environments where D-Bus or Google Sync might be unstable.
    *   **Fix**: Use `chrome.storage.local` for all critical startup data.

3.  **The "Slow Start" Pattern**:
    *   Extension service workers fire immediately, often before the browser's window manager is ready.
    *   **Fix**: Always wrap startup logic in a `setTimeout` delay (1–2 seconds) to allow the OS subsystems to stabilize.

4.  **Sequential IPC (No Bursts)**:
    *   Firing 10+ `chrome.tabs.create` or `remove` calls at once can overwhelm the browser's message bus.
    *   **Fix**: Implement a `sleep(300)` between individual tab operations.

## 🔍 Debugging Workflow (The "Fix-it-Fast" Protocol)

If Chromium fails to launch OR hangs after loading your extension:

### Step 1: Isolation (The Manifest Trick)
*   **Rename `manifest.json`** to `manifest.json.bak`.
*   Launch Chromium. If it opens, the extension was the cause.
*   Restore `manifest.json` and move to Step 2.

### Step 2: Minimal Mode
*   Simplify `background.js` to a single `console.log`.
*   Remove all permissions from `manifest.json`.
*   Add permissions/code back one-by-one until it breaks. This identifies the specific API causing the crash.

### Step 3: Zombie Cleanup
*   Stuck extensions often leave hidden background processes that block new launches.
*   **Command**: `killall -9 chromium; killall -9 snap-confine` (on Linux).

### Step 4: CLI Debugging
Run Chromium from terminal with logging enabled to see Service Worker errors:
```bash
chromium --load-extension=. --enable-logging=stderr --v=1 2>&1 | grep "MemoKit"
```

## 📜 Code Style Guidelines
*   **Wait Utility**: Always include a `const sleep = (ms) => new Promise(r => setTimeout(r, ms));`.
*   **Safety Guards**: Never call `chrome.tabs.remove` without checking if it's the last tab in the window.
*   **Error Logger**: Implement a local storage logger (`logError`) since background console logs are often hard to capture during crashes.
