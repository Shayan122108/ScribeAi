import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  // eslint-disable-next-line no-console
  console.warn("GEMINI_API_KEY not found. Streaming will fail until provided.");
}

const client = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const transcriptModel = client?.getGenerativeModel({
  model: "models/gemini-1.5-flash",
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 4096
  }
});

const summaryModel = client?.getGenerativeModel({
  model: "models/gemini-1.5-flash",
  generationConfig: {
    temperature: 0.4,
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

  try {
    // Try to parse the response as JSON
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}') + 1;
    const jsonStr = text.slice(startIdx, endIdx);
    return JSON.parse(jsonStr) as GeminiSummary;
  } catch (e) {
    // If JSON parsing fails, return a fallback object with the raw text
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
