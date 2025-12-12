import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from "electron";
import * as path from "path";
import * as fs from "fs";

let tray: Tray | null = null;
let hiddenWindow: BrowserWindow | null = null;
let isPlaying = false;
let isRecording = false;
let windowReady = false;
let iconRotationInterval: NodeJS.Timeout | null = null;
let recordingCountdownInterval: NodeJS.Timeout | null = null;
let recordingSecondsRemaining = 3;
let autoPlayInterval: NodeJS.Timeout | null = null;

const CLIPS_DIR = path.join(app.getPath("userData"), "clips");

// Icon paths
let normalIcon: Electron.NativeImage | null = null;
let recordingIcon: Electron.NativeImage | null = null;
let brandingIconJY: Electron.NativeImage | null = null;
let brandingIconYJ: Electron.NativeImage | null = null;
let brandingIconJames: Electron.NativeImage | null = null;
// Small icons for tray rotation (16x16)
let trayIconJY: Electron.NativeImage | null = null;
let trayIconYJ: Electron.NativeImage | null = null;
let trayIconJames: Electron.NativeImage | null = null;

// Ensure clips directory exists
function ensureClipsDirectory(): void {
    if (!fs.existsSync(CLIPS_DIR)) {
        fs.mkdirSync(CLIPS_DIR, { recursive: true });
    }
}

// Get all clip files
function getClipFiles(): string[] {
    try {
        ensureClipsDirectory();
        const files = fs.readdirSync(CLIPS_DIR);
        return files
            .filter((file) => file.endsWith(".webm") || file.endsWith(".m4a"))
            .map((file) => path.join(CLIPS_DIR, file))
            .filter((filePath) => {
                try {
                    return fs.existsSync(filePath);
                } catch {
                    return false;
                }
            });
    } catch (error) {
        console.error("Error reading clips directory:", error);
        return [];
    }
}

// Get random clip
function getRandomClip(): string | null {
    const clips = getClipFiles();
    if (clips.length === 0) {
        return null;
    }
    const randomIndex = Math.floor(Math.random() * clips.length);
    return clips[randomIndex];
}

// Play random clip (helper function)
function playRandomClip(): void {
    if (isRecording) {
        console.log("Currently recording, cannot play clip");
        return;
    }

    // If already playing, stop current playback first
    if (isPlaying && hiddenWindow) {
        console.log("Stopping current playback to play new clip");
        hiddenWindow.webContents.send("stop-playback");
        // Reset isPlaying immediately so we can start new playback
        isPlaying = false;
        stopIconRotation(); // Stop icon rotation
    }

    const clipPath = getRandomClip();
    if (clipPath) {
        console.log("Playing clip:", clipPath);
        isPlaying = true;
        startIconRotation(); // Start rotating icons during playback
        if (hiddenWindow) {
            hiddenWindow.webContents.send("play-clip", clipPath);
        }
    } else {
        console.log("No clips available yet");
        if (tray) {
            tray.setToolTip("No clips yet - right click to record");
            setTimeout(() => {
                updateTooltip();
            }, 3000);
        }
    }
}

// Auto-play check: every 10 minutes, 0.1% chance to play random clip
function startAutoPlayCheck(): void {
    // Clear any existing interval
    stopAutoPlayCheck();

    // Check every 10 minutes (600,000 ms)
    autoPlayInterval = setInterval(() => {
        // Only auto-play if not recording and not already playing
        if (isRecording || isPlaying) {
            console.log("Skipping auto-play check - recording or playing");
            return;
        }

        // 0.1% chance = 0.001 probability
        const randomValue = Math.random();
        if (randomValue < 0.001) {
            console.log("Auto-play triggered! (0.1% chance)");
            playRandomClip();
        }
    }, 600000); // 10 minutes = 600,000 milliseconds
}

// Stop auto-play check
function stopAutoPlayCheck(): void {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
}

// Update tooltip with clip count
function updateTooltip(): void {
    if (!tray) return;

    const clipCount = getClipFiles().length;
    if (isRecording) {
        // Countdown is handled by startRecordingCountdown
        return;
    } else if (clipCount === 0) {
        tray.setToolTip("Family Voices (0 clips)");
    } else {
        tray.setToolTip(
            `Family Voices (${clipCount} clip${clipCount !== 1 ? "s" : ""})`
        );
    }
}

// Start countdown timer during recording
function startRecordingCountdown(): void {
    // Clear any existing countdown
    stopRecordingCountdown();

    recordingSecondsRemaining = 3;

    // Update immediately
    if (tray) {
        tray.setToolTip(`${recordingSecondsRemaining} seconds`);
    }

    // Update every second
    recordingCountdownInterval = setInterval(() => {
        recordingSecondsRemaining--;

        if (!tray || !isRecording) {
            stopRecordingCountdown();
            return;
        }

        if (recordingSecondsRemaining > 0) {
            tray.setToolTip(
                `${recordingSecondsRemaining} second${
                    recordingSecondsRemaining !== 1 ? "s" : ""
                }`
            );
        } else {
            tray.setToolTip("Recording...");
            stopRecordingCountdown();
        }
    }, 1000);
}

// Stop countdown timer
function stopRecordingCountdown(): void {
    if (recordingCountdownInterval) {
        clearInterval(recordingCountdownInterval);
        recordingCountdownInterval = null;
    }
    recordingSecondsRemaining = 3;
}

// Switch to recording icon
function setRecordingIcon(): void {
    if (tray && recordingIcon) {
        tray.setImage(recordingIcon);
    }
    isRecording = true;
    startRecordingCountdown(); // Start countdown timer
}

// Switch to normal icon
function setNormalIcon(): void {
    if (tray && normalIcon) {
        tray.setImage(normalIcon);
    }
    isRecording = false;
    stopRecordingCountdown(); // Stop countdown timer
    updateTooltip();
}

// Start icon rotation during playback
function startIconRotation(): void {
    // Clear any existing interval
    stopIconRotation();

    if (!tray) return;

    // Get available icons for rotation
    const availableIcons: Electron.NativeImage[] = [];
    if (trayIconJY) availableIcons.push(trayIconJY);
    if (trayIconYJ) availableIcons.push(trayIconYJ);
    if (trayIconJames) availableIcons.push(trayIconJames);

    // Fallback to normal icon if no branding icons available
    if (availableIcons.length === 0 && normalIcon) {
        availableIcons.push(normalIcon);
    }

    if (availableIcons.length === 0) return;

    // Rotate icons every 300ms
    iconRotationInterval = setInterval(() => {
        if (!tray || !isPlaying) {
            stopIconRotation();
            return;
        }
        const randomIcon =
            availableIcons[Math.floor(Math.random() * availableIcons.length)];
        tray.setImage(randomIcon);
    }, 300);
}

// Stop icon rotation
function stopIconRotation(): void {
    if (iconRotationInterval) {
        clearInterval(iconRotationInterval);
        iconRotationInterval = null;
    }
    // Reset to normal icon
    if (tray && normalIcon && !isRecording) {
        tray.setImage(normalIcon);
    }
}

// Create hidden window for audio operations
function createHiddenWindow(): void {
    hiddenWindow = new BrowserWindow({
        width: 400,
        height: 300,
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    hiddenWindow.loadFile(path.join(__dirname, "renderer.html"));

    // Wait for window to be ready before allowing IPC messages
    hiddenWindow.webContents.once("did-finish-load", () => {
        console.log("Hidden window finished loading, renderer ready");
        windowReady = true;
    });

    // Open DevTools in development for debugging
    if (process.env.NODE_ENV === "development" || !app.isPackaged) {
        hiddenWindow.webContents.openDevTools({ mode: "detach" });
        hiddenWindow.show(); // Show window in dev mode for easier debugging
    }

    // Forward console logs from renderer to main
    hiddenWindow.webContents.on(
        "console-message",
        (event, level, message, line, sourceId) => {
            console.log(`[Renderer] ${message}`);
        }
    );

    hiddenWindow.on("closed", () => {
        hiddenWindow = null;
    });
}

// Create tray icon
function createTray(): void {
    // Load icons
    const iconPath = path.join(__dirname, "..", "assets", "icon.png");
    const brandingJYPath = path.join(__dirname, "..", "assets", "icon_jy.png");

    if (fs.existsSync(iconPath)) {
        normalIcon = nativeImage
            .createFromPath(iconPath)
            .resize({ width: 16, height: 16 });
    } else {
        normalIcon = nativeImage.createEmpty();
    }

    // Use icon_jy.png for recording icon
    if (fs.existsSync(brandingJYPath)) {
        recordingIcon = nativeImage
            .createFromPath(brandingJYPath)
            .resize({ width: 16, height: 16 });
        // Also create small tray icon for rotation
        trayIconJY = nativeImage
            .createFromPath(brandingJYPath)
            .resize({ width: 16, height: 16 });
    } else {
        recordingIcon = normalIcon; // Fallback to normal icon
    }

    // Load branding icons
    const brandingYJPath = path.join(__dirname, "..", "assets", "icon_yj.png");
    const brandingJamesPath = path.join(
        __dirname,
        "..",
        "assets",
        "icon_james.png"
    );

    const iconSize = 46; // Size for each icon (same size for all) - 20% bigger than 38

    // Load branding icons
    if (fs.existsSync(brandingJYPath)) {
        brandingIconJY = nativeImage
            .createFromPath(brandingJYPath)
            .resize({ width: iconSize, height: iconSize });
    }
    if (fs.existsSync(brandingYJPath)) {
        brandingIconYJ = nativeImage
            .createFromPath(brandingYJPath)
            .resize({ width: iconSize, height: iconSize });
        // Also create small tray icon for rotation
        trayIconYJ = nativeImage
            .createFromPath(brandingYJPath)
            .resize({ width: 16, height: 16 });
    }
    if (fs.existsSync(brandingJamesPath)) {
        brandingIconJames = nativeImage
            .createFromPath(brandingJamesPath)
            .resize({ width: iconSize, height: iconSize });
        // Also create small tray icon for rotation
        trayIconJames = nativeImage
            .createFromPath(brandingJamesPath)
            .resize({ width: 16, height: 16 });
    }

    tray = new Tray(normalIcon);
    updateTooltip();

    // Left click - play random clip
    tray.on("click", () => {
        playRandomClip();
    });

    // Right click - show context menu
    tray.on("right-click", () => {
        const clipCount = getClipFiles().length;
        const contextMenu = Menu.buildFromTemplate([
            {
                label: isRecording ? "Recording..." : "Say something for mum",
                icon: brandingIconJY || undefined,
                enabled: !isRecording,
                click: () => {
                    console.log("Starting 3-second recording...");
                    setRecordingIcon();
                    if (!windowReady) {
                        console.error(
                            "Window not ready yet, cannot send start-recording"
                        );
                        setNormalIcon();
                        return;
                    }
                    if (hiddenWindow && !hiddenWindow.isDestroyed()) {
                        console.log(
                            "Sending start-recording message to renderer"
                        );
                        hiddenWindow.webContents.send("start-recording");
                    } else {
                        console.error(
                            "hiddenWindow is null or destroyed, cannot send start-recording"
                        );
                        setNormalIcon();
                    }
                },
            },
            {
                type: "separator",
            },
            {
                label: `${clipCount} voices for me`,
                icon: brandingIconYJ || undefined,
                click: () => {
                    playRandomClip();
                },
            },
            {
                type: "separator",
            },
            {
                label: "Back to the shadows",
                icon: brandingIconJames || undefined,
                click: () => {
                    app.quit();
                },
            },
        ]);
        if (tray) {
            tray.popUpContextMenu(contextMenu);
        }
    });
}

// IPC handlers
ipcMain.on("recording-complete", (event, audioData: Buffer) => {
    ensureClipsDirectory();
    const timestamp = Date.now();
    const filename = `clip-${timestamp}.webm`;
    const filePath = path.join(CLIPS_DIR, filename);

    try {
        fs.writeFileSync(filePath, audioData);
        console.log("Saved clip:", filePath);
        setNormalIcon();
        if (tray) {
            tray.setToolTip("✅ Clip saved!");
            setTimeout(() => {
                updateTooltip();
            }, 2000);
        }
    } catch (error) {
        console.error("Error saving clip:", error);
        setNormalIcon();
        if (tray) {
            tray.setToolTip("❌ Failed to save clip");
            setTimeout(() => {
                updateTooltip();
            }, 3000);
        }
    }
});

ipcMain.on("recording-error", (event, errorMessage: string) => {
    console.error("Recording error:", errorMessage);
    setNormalIcon();
    if (tray) {
        tray.setToolTip(`❌ Recording failed: ${errorMessage}`);
        setTimeout(() => {
            updateTooltip();
        }, 3000);
    }
});

ipcMain.on("playback-complete", () => {
    console.log("Playback complete");
    isPlaying = false;
    stopIconRotation(); // Stop rotating icons when playback ends
});

ipcMain.on("playback-error", (event, errorMessage: string) => {
    console.error("Playback error:", errorMessage);
    isPlaying = false;
    stopIconRotation(); // Stop rotating icons on error
});

// App lifecycle
app.whenReady().then(() => {
    ensureClipsDirectory();
    createHiddenWindow();
    createTray();
    startAutoPlayCheck(); // Start auto-play check every 10 minutes
});

app.on("window-all-closed", (e: Event) => {
    // Prevent app from quitting when windows are closed
    e.preventDefault();
});

app.on("before-quit", () => {
    stopAutoPlayCheck(); // Stop auto-play check
    stopIconRotation(); // Stop icon rotation
    stopRecordingCountdown(); // Stop recording countdown
    if (tray) {
        tray.destroy();
        tray = null;
    }
});
