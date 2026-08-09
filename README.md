# ScribeAI

AI-powered meeting transcription and summarization tool built with Next.js 14, OpenAI Whisper, Google Gemini, Socket.io, PostgreSQL, and a Chrome Browser Extension.

## Features

- 🎤 **Real-time Audio Transcription**: Capture audio directly from microphone or browser tabs (Google Meet, Zoom, Webex)
- 🧩 **Chrome Extension Integration**: Built-in `scribeai_extension` for capturing tab audio seamlessly
- ⚡ **OpenAI Whisper Speech-to-Text**: Fast and accurate audio transcription via OpenAI's Whisper model (`whisper-1`)
- 🤖 **Gemini-Powered Summarization**: Automatic meeting summaries with key points, action items, and decisions using `gemini-2.0-flash`
- 📝 **Live Transcript Streaming**: Real-time WebSocket updates over Socket.io
- 🔐 **Authentication**: User authentication with Better Auth
- 💾 **Session Management**: Full persistence for sessions, transcript chunks, and summaries using Prisma ORM
- ⏸️ **Pause / Resume / Stop**: Interactive recording controls with state management via XState machines

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TanStack React Query, XState
- **Backend & WebSockets**: Node.js, Express, Socket.io, `tsx`
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth
- **AI Models**: 
  - **OpenAI Whisper (`whisper-1`)**: Real-time audio transcription
  - **Google Gemini (`gemini-2.0-flash`)**: Meeting summarization (key points, action items, decisions)
- **Browser Extension**: Manifest V3 Chrome Extension (`scribeai_extension`) for Chrome tab capture (`chrome.tabCapture`)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or hosted e.g. Supabase, Neon)
- OpenAI API Key ([Get one here](https://platform.openai.com/api-keys)) for Whisper transcription
- Google Gemini API Key ([Get one here](https://ai.google.dev)) for transcript summarization

## Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd scribeai
npm install
```

### 2. Set Up Environment Variables

Copy `env.example` to `.env`:

```bash
cp env.example .env
```

Configure the following variables in `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/scribeai"

# Better Auth Configuration
BETTER_AUTH_SECRET="generate-a-random-secret-here"
BETTER_AUTH_URL="http://localhost:3000"

# WebSocket Server Configuration
SOCKET_SERVER_PORT="3100"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3100"

# AI Provider API Keys
OPENAI_API_KEY="sk-your-openai-api-key"
GEMINI_API_KEY="your-gemini-api-key"
```

Generate `BETTER_AUTH_SECRET` if needed:
```bash
openssl rand -base64 32
```

### 3. Set Up Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run Database Migrations
npm run prisma:migrate
```

### 4. Start Development Servers

Run both Next.js app and Socket.io server concurrently:

```bash
npm run dev
```

This starts:
- Next.js Web Application on `http://localhost:3000`
- Express / Socket.io Backend Server on `http://localhost:3100`

Or start them individually:
```bash
npm run dev:next    # Next.js only
npm run dev:server  # Socket.io server only
```

### 5. Install Chrome Extension (Optional, for Tab Audio Capture)

1. Open Google Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle switch in the top right)
3. Click **Load unpacked**
4. Select the `scribeai_extension` folder in this project

## System Architecture

```mermaid
sequenceDiagram
    participant U as Browser UI / Extension
    participant S as Socket.io Server (Node/Express)
    participant W as OpenAI Whisper API
    participant G as Google Gemini API
    participant DB as Postgres (Prisma)

    U->>S: session:start (sessionId, source, auth)
    S->>DB: Upsert User & Session (RECORDING)
    S-->>U: session:ack

    loop Real-time Streaming (Audio Chunks)
        U->>S: session:chunk (base64 audio, sequence)
        S->>W: transcribeAudio(audio, mimeType)
        W-->>S: transcript text
        S-->>U: transcription:update (sequence, text)
    end

    U->>S: session:stop (sessionId)
    S->>DB: Update Session (PROCESSING)
    S->>G: summarizeTranscript(full transcript)
    G-->>S: summary JSON (keyPoints, actionItems, decisions)
    S->>DB: Transaction: Persist Transcript Chunks & Summary
    S->>DB: Update Session (COMPLETED)
    S-->>U: session:status (COMPLETED + summary)
```

## Project Structure

```
scribeai/
├── app/
│   ├── api/                      # Next.js API routes (auth, sessions)
│   │   ├── auth/                 # Better Auth endpoints
│   │   └── sessions/             # Session CRUD REST API
│   ├── login/                    # Authentication page
│   ├── sessions/                 # Live recording & session management UI
│   └── layout.tsx                # Root App Router layout
├── components/
│   └── ui/                       # Reusable Tailwind UI components
├── hooks/
│   └── useRecorderMachine.ts      # XState machine hook for recording logic
├── lib/
│   ├── auth.ts                   # Better Auth setup
│   ├── auth-client.ts            # Client-side auth utilities
│   ├── gemini.ts                 # Google Gemini API integration (summarization)
│   ├── prisma.ts                 # Prisma client instance
│   ├── socket-client.ts          # Socket.io client setup
│   └── whisper.ts                # OpenAI Whisper API integration (transcription)
├── prisma/
│   └── schema.prisma             # Database schema (User, Session, TranscriptChunk, Summary)
├── server/
│   └── index.ts                  # Express + Socket.io backend server
├── scribeai_extension/           # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── background.js             # Service worker for tab capture
│   ├── content.js                # Page communication script
│   ├── popup.html                # Extension popup UI
│   └── popup.js                  # Popup script
├── types/                        # Shared TypeScript type definitions
└── WHISPER_SETUP.md              # Additional setup guide for Whisper API
```

## API Reference & Socket Events

### REST API Endpoints

- `GET /api/sessions` - List user sessions
- `GET /api/sessions/[id]` - Retrieve session details and full transcripts
- `DELETE /api/sessions/[id]` - Delete a session
- `POST /api/auth/*` - Better Auth sign-in / sign-up endpoints

### Socket.io Events

**Client → Server:**
- `session:start` - Start new recording session (`{ sessionId, userId, userEmail, source }`)
- `session:chunk` - Send base64 audio chunk (`{ sessionId, sequence, startedAt, endedAt, audio, mimeType }`)
- `session:pause` - Pause current recording session (`{ sessionId }`)
- `session:resume` - Resume paused session (`{ sessionId }`)
- `session:stop` - Finalize recording and trigger AI summarization (`{ sessionId }`)

**Server → Client:**
- `session:ack` - Session initialized acknowledgment
- `transcription:update` - Real-time transcript stream chunk (`{ sessionId, sequence, text, speakerTag }`)
- `session:status` - Session state transition (`PAUSED`, `RECORDING`, `PROCESSING`, `COMPLETED`)
- `session:error` - Error notification

## NPM Scripts

- `npm run dev` - Start Next.js frontend and Socket server concurrently
- `npm run dev:server` - Start Socket.io server with `tsx watch`
- `npm run dev:next` - Start Next.js development server
- `npm run build` - Build Next.js application for production
- `npm run start` - Start Next.js production server
- `npm run lint` - Run ESLint checks
- `npm run typecheck` - Run TypeScript type checking
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Execute database migrations

## License

MIT
