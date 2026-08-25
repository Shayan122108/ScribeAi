import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  // eslint-disable-next-line no-console
  console.warn("GEMINI_API_KEY not found. Streaming will fail until provided.");
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export type GeminiSummary = {
  keyPoints: string;
  actionItems: string;
  decisions: string;
};

export async function summarizeTranscript(transcript: string): Promise<GeminiSummary> {
  if (!ai) throw new Error("Gemini API key not configured");

  const prompt = `Please analyze the following meeting transcript and provide a structured summary with the following sections:
  - Key points discussed
  - Action items with owners (if any)
  - Decisions made

Format the response as a JSON object with these exact keys:
{
  "keyPoints": "...",
  "actionItems": "...",
  "decisions": "..."
}

Transcript:
${transcript}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      temperature: 0.4,
      responseMimeType: "application/json"
    }
  });

  const text = response.text;
  if (!text) {
    return {
      keyPoints: "",
      actionItems: "Could not extract action items",
      decisions: "Could not extract decisions"
    };
  }

  try {
    return JSON.parse(text) as GeminiSummary;
  } catch (e) {
    // Fallback in case of unexpected model output
    return {
      keyPoints: text,
      actionItems: "Could not extract action items",
      decisions: "Could not extract decisions"
    };
  }
}
