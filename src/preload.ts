import { contextBridge, ipcRenderer } from "electron";

// Store callbacks for IPC listeners
let startRecordingCallback: (() => void) | null = null;
let playClipCallback: ((filePath: string) => void) | null = null;
let stopPlaybackCallback: (() => void) | null = null;

// Set up IPC listeners immediately when preload script loads
ipcRenderer.on("start-recording", () => {
    console.log("[Preload] Received start-recording IPC message");
    if (startRecordingCallback) {
        console.log("[Preload] Calling startRecordingCallback");
        startRecordingCallback();
    } else {
        console.warn("[Preload] startRecordingCallback not set yet");
    }
});

ipcRenderer.on("play-clip", (event, filePath: string) => {
    if (playClipCallback) {
        playClipCallback(filePath);
    }
});

ipcRenderer.on("stop-playback", () => {
    if (stopPlaybackCallback) {
        stopPlaybackCallback();
    }
});

// Expose safe IPC methods to renderer
contextBridge.exposeInMainWorld("electronAPI", {
    // Send recording data to main process
    sendRecordingComplete: (audioData: ArrayBuffer) => {
        ipcRenderer.send("recording-complete", Buffer.from(audioData));
    },

    // Send recording error to main process
    sendRecordingError: (error: string) => {
        ipcRenderer.send("recording-error", error);
    },

    // Send playback complete to main process
    sendPlaybackComplete: () => {
        ipcRenderer.send("playback-complete");
    },

    // Send playback error to main process
    sendPlaybackError: (error: string) => {
        ipcRenderer.send("playback-error", error);
    },

    // Register callback for recording start command
    onStartRecording: (callback: () => void) => {
        console.log("[Preload] onStartRecording called, storing callback");
        startRecordingCallback = callback;
    },

    // Register callback for play clip command
    onPlayClip: (callback: (filePath: string) => void) => {
        playClipCallback = callback;
    },

    // Register callback for stop playback command
    onStopPlayback: (callback: () => void) => {
        stopPlaybackCallback = callback;
    },
});
