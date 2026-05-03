import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn("OPENAI_API_KEY not found. Transcription will fail until provided.");
}

const openai = apiKey ? new OpenAI({ apiKey }) : null;

/**
 * Transcribes audio using OpenAI's Whisper model.
 * 
 * @param audioBase64 - Base64-encoded audio data
 * @param mimeType - MIME type of the audio (e.g., "audio/webm", "audio/mp4")
 * @returns Transcribed text with speaker tag and confidence
 */
export async function transcribeAudio(
    audioBase64: string,
    mimeType: string = "audio/webm"
): Promise<{ text: string; speakerTag: string; confidence?: number }> {
    if (!openai) {
        throw new Error("OpenAI client not configured. Please set OPENAI_API_KEY.");
    }

    try {
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audioBase64, "base64");

        // Determine file extension from MIME type
        const extension = getExtensionFromMimeType(mimeType);

        // Create a File object from the buffer
        // Whisper API expects a file-like object
        const file = new File([audioBuffer], `audio.${extension}`, { type: mimeType });

        // Call Whisper API
        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: "whisper-1",
            language: "en", // Auto-detect if not specified, but "en" is faster
            response_format: "verbose_json", // Get detailed response with timestamps
        });

        console.log(`[Whisper] Transcribed: "${transcription.text}" (duration: ${transcription.duration}s)`);

        // Extract text
        const text = transcription.text?.trim() || "";

        // Whisper doesn't provide speaker diarization by default
        // For now, we'll use a single speaker tag
        // You can add speaker diarization using additional services if needed

        return {
            text: text,
            speakerTag: "speaker",
            confidence: 0.9 // Whisper doesn't provide confidence, using high default
        };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Whisper transcription error:", error);

        // Return empty transcription on error
        return {
            text: "",
            speakerTag: "speaker",
            confidence: 0
        };
    }
}

/**
 * Helper function to get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
        "audio/webm": "webm",
        "audio/webm;codecs=opus": "webm",
        "audio/ogg": "ogg",
        "audio/ogg;codecs=opus": "ogg",
        "audio/mp4": "mp4",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
    };

    return mimeMap[mimeType] || "webm";
}
