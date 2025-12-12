# YJ - Family Voices

A minimal macOS menu bar / system tray app for playing short voice clips from family members when you need a moment of connection.

## Features

- Lives in your menu bar / system tray
- Left click: plays a random voice clip
- Right click: record a new 5-second clip or quit
- Clips persist across app restarts
- No UI windows, no configuration screens - just simple audio recording and playback

## Requirements

- Node.js 18+ and npm
- macOS (primary target), Windows, or Linux

## Installation

1. Install dependencies:
```bash
npm install
```

## Development

Run the app in development mode:

```bash
npm run dev
```

This will:
1. Compile TypeScript files to `dist/`
2. Launch the Electron app

## Building

### Build for macOS (current platform)

```bash
npm run package
```

This creates distributable files in the `dist/` directory:
- `YJ-1.0.0-arm64.dmg` - DMG installer
- `YJ-1.0.0-arm64-mac.zip` - ZIP archive
- `dist/mac-arm64/YJ.app` - App bundle (can be run directly)

### Build for all platforms

```bash
npm run package:all
```

This will build for macOS, Windows, and Linux (requires appropriate build tools for each platform).

## Usage

1. **First launch**: The app will appear in your menu bar / system tray. Right-click and select "Record 5 seconds" to add your first voice clip.

2. **Recording**: When you select "Record 5 seconds", the app will:
   - Request microphone permission (first time only)
   - Record for exactly 5 seconds
   - Automatically save the clip
   - Show a brief confirmation in the tooltip

3. **Playback**: Left-click the tray icon to hear a random clip from your collection.

4. **Managing clips**: Audio files are stored in your app data directory:
   - macOS: `~/Library/Application Support/yj/clips/`
   - Windows: `%APPDATA%/yj/clips/`
   - Linux: `~/.config/yj/clips/`

   You can manually delete clips by removing files from this folder.

## Technical Details

### Architecture

- **Main Process** (`main.ts`): Handles tray icon, menu, and file I/O
- **Renderer Process** (`renderer.ts`): Handles microphone recording via `getUserMedia` and audio playback via `HTMLAudioElement`
- **Preload Script** (`preload.ts`): Provides secure IPC bridge with context isolation
- **Audio Format**: WebM (Opus codec) for cross-platform compatibility
- **Storage**: Files saved with timestamp-based names: `clip-<timestamp>.webm`

### Security

- Context isolation enabled
- No Node.js integration in renderer
- IPC communication via secure preload bridge
- No external network access

## Platform-Specific Notes

### macOS
- Primary target platform
- App appears in menu bar on the right side
- Microphone permission prompt will appear on first recording
- Add to login items via System Preferences if you want it to start automatically

### Windows
- App appears in system tray (bottom-right)
- May need to enable "Show hidden icons" to see the tray icon
- Microphone permission handled by Windows settings

### Linux
- App appears in system tray
- Tray icon behavior may vary by desktop environment
- Some DEs (like GNOME) require extensions for system tray support

## Troubleshooting

### No sound when clicking
- Check that you have at least one clip recorded
- Verify system audio output is working
- Check the clips directory exists and contains `.webm` files

### Recording not working
- Grant microphone permission when prompted
- macOS: Check System Preferences > Security & Privacy > Microphone
- Ensure a microphone is connected and working

### Tray icon not visible
- macOS: Check that the icon isn't hidden in menu bar overflow
- Windows: Click "Show hidden icons" in system tray
- Linux: Ensure your DE supports system tray icons

## File Structure

```
yj/
├── src/
│   ├── main.ts          # Main Electron process
│   ├── preload.ts       # IPC bridge
│   ├── renderer.ts      # Audio recording/playback logic
│   └── renderer.html    # Minimal HTML for renderer
├── assets/
│   └── icon.png         # App icon (add your own)
├── dist/               # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT

## Credits

Built with Electron and TypeScript.
