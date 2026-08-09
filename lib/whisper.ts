import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn("OPENAI_API_KEY not found. Transcription will fail until provided.");
}

const openai = apiKey ? new OpenAI({ apiKey }) : null;

// Configurable via env so a model upgrade never requires a code change
const WHISPER_MODEL = process.env.WHISPER_MODEL ?? "whisper-1";

// Configurable via env; defaults to auto-detection when not set
const WHISPER_LANGUAGE = process.env.WHISPER_LANGUAGE ?? undefined;

/**
 * Transcribes audio using OpenAI's Whisper model.
 *
 * @param audioBase64 - Base64-encoded audio data
 * @param mimeType - MIME type of the audio (e.g., "audio/webm", "audio/mp4")
 * @returns Transcribed text with speaker tag
 */
export async function transcribeAudio(
    audioBase64: string,
    mimeType: string = "audio/webm"
): Promise<{ text: string; speakerTag: string }> {
    if (!openai) {
        throw new Error("OpenAI client not configured. Please set OPENAI_API_KEY.");
    }

    try {
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audioBase64, "base64");

        // Determine file extension from MIME type
        const extension = getExtensionFromMimeType(mimeType);

        // Create a File object from the buffer
        const file = new File([audioBuffer], `audio.${extension}`, { type: mimeType });

        // Call Whisper API
        const transcription = await openai.audio.transcriptions.create({
            file,
            model: WHISPER_MODEL,
            ...(WHISPER_LANGUAGE ? { language: WHISPER_LANGUAGE } : {}),
            response_format: "text",
        });

        // eslint-disable-next-line no-console
        console.log(`[Whisper] Transcribed ${extension} chunk (model: ${WHISPER_MODEL})`);

        // Whisper doesn't provide speaker diarization by default
        return {
            text: (transcription as unknown as string)?.trim() ?? "",
            speakerTag: "speaker"
        };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Whisper transcription error:", error);

        return {
            text: "",
            speakerTag: "speaker"
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
