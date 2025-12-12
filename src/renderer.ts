const audioPlayer = document.getElementById("audioPlayer") as HTMLAudioElement;

let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let activeStream: MediaStream | null = null;

// Wait for electronAPI to be available
function setupListeners(): void {
    if (!window.electronAPI) {
        console.error("Renderer: electronAPI not available!");
        setTimeout(setupListeners, 100);
        return;
    }

    console.log("Renderer: electronAPI available, setting up listeners...");

    // Listen for recording start command from main process
    window.electronAPI.onStartRecording(() => {
        console.log("Renderer: onStartRecording callback invoked!");
        startRecording();
    });
    console.log("Renderer: IPC listener for start-recording registered");

    // Listen for play clip command from main process
    window.electronAPI.onPlayClip((filePath: string) => {
        playClip(filePath);
    });

    // Listen for stop playback command from main process
    window.electronAPI.onStopPlayback(() => {
        stopPlayback();
    });
    console.log("Renderer: All IPC listeners registered");
}

// Start setting up listeners when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupListeners);
} else {
    setupListeners();
}

// Start 3-second recording
async function startRecording(): Promise<void> {
    try {
        console.log("startRecording called");

        // Prevent multiple simultaneous recordings
        if (mediaRecorder && mediaRecorder.state === "recording") {
            console.log("Already recording, ignoring request");
            return;
        }

        // Clean up any existing stream before starting new recording
        if (activeStream) {
            console.log("Cleaning up previous stream...");
            activeStream.getTracks().forEach((track) => track.stop());
            activeStream = null;
        }

        recordedChunks = [];

        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("getUserMedia not supported");
        }

        console.log("Requesting microphone access...");
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100,
            },
        });
        activeStream = stream; // Track the active stream globally
        console.log("Microphone access granted");

        // Check supported MIME types
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "";

        if (!mimeType) {
            stream.getTracks().forEach((track) => track.stop());
            throw new Error("No supported audio MIME type found");
        }

        console.log("Using MIME type:", mimeType);

        // Create MediaRecorder with webm format
        const options: MediaRecorderOptions = {
            mimeType: mimeType,
        };

        const recorder = new MediaRecorder(stream, options);
        mediaRecorder = recorder;
        console.log("MediaRecorder created");

        mediaRecorder.ondataavailable = (event: BlobEvent) => {
            console.log("Data available, size:", event.data.size);
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            console.log("Recording stopped, chunks:", recordedChunks.length);

            // Stop all tracks
            stream.getTracks().forEach((track) => track.stop());
            activeStream = null; // Clear the global reference

            if (recordedChunks.length === 0) {
                console.error("No audio data recorded");
                window.electronAPI.sendRecordingError("No audio data captured");
                return;
            }

            // Combine chunks into a single blob
            const blob = new Blob(recordedChunks, { type: mimeType });
            console.log("Blob size:", blob.size, "bytes");

            if (blob.size === 0) {
                console.error("Empty blob");
                window.electronAPI.sendRecordingError("No audio data captured");
                return;
            }

            // Convert blob to ArrayBuffer
            const arrayBuffer = await blob.arrayBuffer();
            console.log("ArrayBuffer size:", arrayBuffer.byteLength, "bytes");

            // Send to main process
            window.electronAPI.sendRecordingComplete(arrayBuffer);

            // Clear chunks
            recordedChunks = [];
            mediaRecorder = null;
        };

        mediaRecorder.onerror = (event: Event) => {
            console.error("MediaRecorder error:", event);
            window.electronAPI.sendRecordingError("Recording failed");
            stream.getTracks().forEach((track) => track.stop());
            activeStream = null; // Clear the global reference
        };

        recorder.onstart = () => {
            console.log("MediaRecorder started successfully");
        };

        // Start recording - request data in chunks
        recorder.start(100); // Request data every 100ms
        console.log("Recording started, will stop in 3 seconds...");

        // Stop after 3 seconds - use recorder variable from closure
        setTimeout(() => {
            console.log("3 seconds elapsed, checking state...");
            console.log("Recorder state:", recorder.state);

            // Force stop the recording and cleanup
            try {
                if (
                    recorder.state === "recording" ||
                    recorder.state === "paused"
                ) {
                    console.log("Stopping recording now...");
                    recorder.stop();
                } else {
                    console.log(
                        "Recorder already stopped, state:",
                        recorder.state
                    );
                    // If recorder already stopped but tracks are still active, clean them up
                    if (activeStream) {
                        activeStream.getTracks().forEach((track) => {
                            if (track.readyState === "live") {
                                console.log(
                                    "Stopping active track:",
                                    track.kind
                                );
                                track.stop();
                            }
                        });
                        activeStream = null;
                    }
                }
            } catch (error) {
                console.error("Error stopping recorder:", error);
                // Force cleanup even if stop() fails
                if (activeStream) {
                    activeStream.getTracks().forEach((track) => track.stop());
                    activeStream = null;
                }
                window.electronAPI.sendRecordingError(
                    "Failed to stop recording"
                );
            }
        }, 5000);
    } catch (error) {
        console.error("Error starting recording:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        window.electronAPI.sendRecordingError(errorMessage);
    }
}

// Stop current playback
function stopPlayback(): void {
    try {
        console.log("Stopping current playback");
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        audioPlayer.src = "";
        // Don't send playback-complete here - that's only for natural end of playback
    } catch (error) {
        console.error("Error stopping playback:", error);
    }
}

// Play audio clip
function playClip(filePath: string): void {
    try {
        // Stop any existing playback first
        stopPlayback();

        // Convert file path to file:// URL
        const fileUrl = `file://${filePath}`;

        audioPlayer.src = fileUrl;

        audioPlayer.onended = () => {
            console.log("Playback finished");
            window.electronAPI.sendPlaybackComplete();
        };

        audioPlayer.onerror = (event) => {
            console.error("Playback error:", event);
            window.electronAPI.sendPlaybackError("Playback failed");
        };

        audioPlayer.play().catch((error) => {
            console.error("Error playing audio:", error);
            window.electronAPI.sendPlaybackError(error.message);
        });
    } catch (error) {
        console.error("Error in playClip:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        window.electronAPI.sendPlaybackError(errorMessage);
    }
}
