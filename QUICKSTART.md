# Quick Start Guide

## Get up and running in 3 steps:

### 1. Install dependencies
```bash
npm install
```

### 2. Run the app
```bash
npm run dev
```

In dev mode, you'll see:
- A DevTools window (Chrome inspector) for debugging
- The hidden renderer window (normally invisible)
- The tray icon in your menu bar

### 3. Use the app
- Look for the tray icon in your menu bar (macOS) or system tray (Windows/Linux)
- **Right-click** → "Record 5 seconds" to add your first clip
  - Icon turns **RED** while recording (5 seconds)
  - Tooltip shows "🔴 Recording..."
  - Returns to normal when done
- **Left-click** to play a random clip
- **Hover** to see clip count: "Family Voices (X clips)"

## Next steps

### Build a distributable app
```bash
npm run package
```
Find the built app in the `release/` folder.

### Where are my clips stored?
macOS: `~/Library/Application Support/yj/clips/`

You can delete clips by removing files from this folder.

## Need help?
See [README.md](./README.md) for full documentation.
