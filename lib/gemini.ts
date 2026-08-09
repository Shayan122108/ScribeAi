import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  // eslint-disable-next-line no-console
  console.warn("GEMINI_API_KEY not found. Streaming will fail until provided.");
}

const client = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const transcriptModel = client?.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 4096
  }
});

const summaryModel = client?.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.4,
    maxOutputTokens: 1024,
    responseMimeType: "application/json"
  }
});

export type GeminiSummary = {
  keyPoints: string;
  actionItems: string;
  decisions: string;
};

export async function summarizeTranscript(transcript: string): Promise<GeminiSummary> {
  if (!summaryModel) throw new Error("Gemini API key not configured");

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

  const result = await summaryModel.generateContent(prompt);
  const text = result.response.text();

  // responseMimeType is set to "application/json" so the model returns valid JSON directly
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

export function getTranscriptModel(): GenerativeModel {
  if (!transcriptModel) {
    throw new Error("Gemini client not configured");
  }
  return transcriptModel;
}
