"use strict";

import http from "node:http";

import express from "express";
import { Server } from "socket.io";
import { z } from "zod";

import type * as Prisma from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { summarizeTranscript } from "@/lib/gemini";
import { transcribeAudio } from "@/lib/whisper";

const PORT = Number(process.env.SOCKET_SERVER_PORT ?? 3100);

const app = express();
const httpServer = http.createServer(app);

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3000";

const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGIN, credentials: true }
});

const startSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string(),
  userEmail: z.string().email(),
  source: z.enum(["MIC", "TAB"])
});

const chunkSchema = z.object({
  sessionId: z.string().uuid(),
  sequence: z.number().int().nonnegative(),
  startedAt: z.number(),
  endedAt: z.number(),
  speakerTag: z.string().default("speaker"),
  audio: z.string().min(10), // base64
  mimeType: z.string().optional().default("audio/webm"),
  text: z.string().optional()
});

type ChunkPayload = z.infer<typeof chunkSchema>;

const buffer = new Map<string, ChunkPayload[]>();

io.on("connection", (socket) => {
  socket.on("session:start", async (rawPayload) => {
    const parsed = startSchema.safeParse(rawPayload);
    if (!parsed.success) {
      socket.emit("session:error", { message: parsed.error.message });
      return;
    }

    const { sessionId, userId, userEmail, source } = parsed.data;

    buffer.set(sessionId, []);

    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email: userEmail },
      update: { email: userEmail }
    });

    await prisma.session.upsert({
      where: { id: sessionId },
      create: { id: sessionId, userId, status: "RECORDING", source },
      update: { status: "RECORDING" }
    });

    socket.join(sessionId);
    socket.emit("session:ack", { sessionId, status: "RECORDING" });
  });

  socket.on("session:chunk", async (rawPayload) => {
    const parsed = chunkSchema.safeParse(rawPayload);
    if (!parsed.success) {
      socket.emit("session:error", { message: parsed.error.message });
      return;
    }
    const payload = parsed.data;

    // Store chunk in buffer
    const store = buffer.get(payload.sessionId);
    if (!store) {
      buffer.set(payload.sessionId, [payload]);
    } else {
      store.push(payload);
    }

    // Transcribe audio if text not provided
    let transcriptText = payload.text;
    let speakerTag = payload.speakerTag;

    if (!transcriptText && payload.audio) {
      try {
        const transcription = await transcribeAudio(
          payload.audio,
          payload.mimeType
        );
        transcriptText = transcription.text;
        speakerTag = transcription.speakerTag;

        // Update payload with transcription result
        payload.text = transcriptText;
        payload.speakerTag = speakerTag;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Transcription failed for chunk ${payload.sequence}:`, error);
        transcriptText = "";
      }
    }

    // Emit transcription update to all clients in session
    io.to(payload.sessionId).emit("transcription:update", {
      sessionId: payload.sessionId,
      sequence: payload.sequence,
      text: transcriptText ?? "",
      speakerTag
    });
  });

  socket.on("session:pause", async ({ sessionId }) => {
    if (!sessionId) return;
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "PAUSED" }
    });
    io.to(sessionId).emit("session:status", { status: "PAUSED" });
  });

  socket.on("session:resume", async ({ sessionId }) => {
    if (!sessionId) return;
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "RECORDING" }
    });
    io.to(sessionId).emit("session:status", { status: "RECORDING" });
  });

  socket.on("session:stop", async ({ sessionId }) => {
    if (!sessionId) return;
    io.to(sessionId).emit("session:status", { status: "PROCESSING" });
    const chunks = buffer.get(sessionId) ?? [];
    // Filter out empty/failed chunks before building the transcript
    const transcript = chunks.map((c) => c.text).filter(Boolean).join("\n");

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "PROCESSING", endedAt: new Date() }
    });

    try {
      const summary = (transcript && transcript.trim().length > 0)
        ? await summarizeTranscript(transcript)
        : null;

      await prisma.$transaction(async (tx) => {
        for (const chunk of chunks) {
          await tx.transcriptChunk.upsert({
            where: {
              sessionId_sequence: {
                sessionId: chunk.sessionId,
                sequence: chunk.sequence
              }
            },
            update: {
              text: chunk.text ?? "",
              speakerTag: chunk.speakerTag
            },
            create: {
              sessionId: chunk.sessionId,
              sequence: chunk.sequence,
              text: chunk.text ?? "",
              speakerTag: chunk.speakerTag,
              startedAt: new Date(chunk.startedAt),
              endedAt: new Date(chunk.endedAt)
            }
          });
        }

        if (summary) {
          await tx.summary.upsert({
            where: { sessionId },
            update: summary,
            create: { sessionId, ...summary }
          });
        }
      });

      await prisma.session.update({
        where: { id: sessionId },
        data: { status: "COMPLETED" }
      });

      io.to(sessionId).emit("session:status", {
        status: "COMPLETED",
        summary
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to process summary for session", sessionId, ":", error);
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: "FAILED" }
      });
      const errorMessage = error instanceof Error ? error.message : "Failed to process summary";
      io.to(sessionId).emit("session:error", {
        message: errorMessage,
        error
      });
    } finally {
      buffer.delete(sessionId);
    }
  });
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Socket server listening on :${PORT}`);
});

