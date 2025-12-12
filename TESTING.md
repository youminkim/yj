# Testing Guide

## Updates Made

### 1. Recording Indicator
- **Red icon** appears while recording (for 5 seconds)
- **Normal icon** returns when recording completes

### 2. Clip Counter
- Tooltip now shows: `Family Voices (X clips)`
- Right-click menu shows: `X clips saved`
- Updates automatically after each recording

### 3. Enhanced Debugging
- Dev mode now opens Chrome DevTools automatically
- Console logs show detailed recording information
- Error messages show exact failure reasons

## How to Test

### Run in Development Mode

```bash
npm run dev
```

This will:
1. Open a DevTools window (Chrome inspector) - **check this for error messages**
2. Show the hidden window (normally invisible)
3. Display the tray icon in your menu bar
4. Forward all renderer console logs to the terminal

### Testing Recording

1. **Right-click the tray icon** → Select "Record 5 seconds"
2. **Watch for**:
   - Icon turns RED immediately
   - Tooltip changes to "🔴 Recording..."
   - macOS permission dialog (first time only)

3. **After 5 seconds**:
   - Icon returns to normal
   - Tooltip shows "✅ Clip saved!"
   - Then updates to show clip count

4. **Check the DevTools console for logs**:
   ```
   [Renderer] startRecording called
   [Renderer] Requesting microphone access...
   [Renderer] Microphone access granted
   [Renderer] Using MIME type: audio/webm;codecs=opus
   [Renderer] MediaRecorder created
   [Renderer] Recording started...
   [Renderer] Data available, size: XXXX
   [Renderer] Recording stopped, chunks: 1
   [Renderer] Blob size: XXXX bytes
   [Renderer] ArrayBuffer size: XXXX bytes
   ```

### Testing Playback

1. **Left-click the tray icon**
2. Should hear your recorded clip
3. Terminal/DevTools should show: `Playing clip: /path/to/clip.webm`

### Checking Clip Count

1. **Hover over tray icon** - tooltip shows count
2. **Right-click** - menu shows count

## Troubleshooting

### Recording Not Working?

Check the DevTools console for errors:

**Common Issues:**

1. **"Permission denied"**
   - Go to: System Preferences → Security & Privacy → Microphone
   - Enable for Electron or YJ app
   - Restart the app

2. **"getUserMedia not supported"**
   - This shouldn't happen in modern Electron
   - Check Electron version

3. **"No audio data captured"**
   - Microphone might not be working
   - Try recording with another app first
   - Check Input volume in System Preferences → Sound

4. **"No supported audio MIME type found"**
   - This is rare, but the app will try fallbacks
   - Check the console for supported types

### Icon Not Changing?

- Make sure `assets/icon-recording.png` exists
- Check terminal for error messages
- Try rebuilding: `npm run build`

### No Clips Showing?

Check the clips directory:
```bash
ls -la ~/Library/Application\ Support/yj/clips/
```

You should see files like: `clip-1234567890123.webm`

## Manual Verification

### Verify Icons Exist
```bash
ls -la assets/
```

Should show:
- `icon.png` (normal icon)
- `icon-recording.png` (red recording indicator)

### Test a Clip File
```bash
# Find a clip
ls ~/Library/Application\ Support/yj/clips/

# Play it with ffplay (if you have ffmpeg installed)
ffplay ~/Library/Application\ Support/yj/clips/clip-*.webm
```

## Terminal Output

You should see output like:
```
[Renderer] startRecording called
Starting 5-second recording...
[Renderer] Requesting microphone access...
[Renderer] Microphone access granted
[Renderer] Using MIME type: audio/webm;codecs=opus
[Renderer] MediaRecorder created
[Renderer] Recording started...
[Renderer] Data available, size: 12345
[Renderer] Recording stopped, chunks: 1
[Renderer] Blob size: 12345 bytes
[Renderer] ArrayBuffer size: 12345 bytes
Saved clip: /Users/.../Library/Application Support/yj/clips/clip-1234567890123.webm
```

## Next Steps

If recording still doesn't work after checking the above:

1. **Share the console output** - Look for red error messages
2. **Check microphone permissions** - System Preferences → Security & Privacy
3. **Try a different microphone** - if using external mic
4. **Verify clips directory** - `~/Library/Application Support/yj/clips/`

The enhanced logging should now show exactly where the problem is!
