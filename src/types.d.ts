// Type declarations for the Electron API exposed via preload
export interface ElectronAPI {
    sendRecordingComplete: (audioData: ArrayBuffer) => void;
    sendRecordingError: (error: string) => void;
    sendPlaybackComplete: () => void;
    sendPlaybackError: (error: string) => void;
    onStartRecording: (callback: () => void) => void;
    onPlayClip: (callback: (filePath: string) => void) => void;
    onStopPlayback: (callback: () => void) => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
