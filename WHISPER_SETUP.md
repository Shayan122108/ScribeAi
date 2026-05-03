# OpenAI Whisper Integration Setup

## What Changed
We've switched from Gemini to OpenAI Whisper for audio transcription because:
- Gemini doesn't support direct audio transcription via its API
- Whisper is purpose-built for speech-to-text
- More reliable and accurate for real-time transcription

## Setup Instructions

### 1. Get an OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

### 2. Add to Your `.env` File
Open your `.env` file and add:
```bash
OPENAI_API_KEY=sk-your-actual-key-here
```

### 3. Restart the Server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npx tsx server/index.ts
```

### 4. Test It!
- Try recording with the microphone
- You should now see actual transcribed text instead of empty strings

## Cost Information
- Whisper API: $0.006 per minute of audio
- For 5-second chunks: ~$0.0005 per chunk
- Very affordable for development

## What Still Uses Gemini
- **Summarization**: Gemini is still used to generate meeting summaries
- You still need your `GEMINI_API_KEY` for this feature

## Troubleshooting

### "OPENAI_API_KEY not found"
- Make sure you added it to `.env` (not `env.example`)
- Restart the server after adding it

### "Insufficient quota" or billing errors
- You may need to add payment method to OpenAI account
- Free tier has limited usage

### Still getting empty transcriptions
- Check server logs for detailed error messages
- Verify your API key is valid
- Make sure you restarted the server
