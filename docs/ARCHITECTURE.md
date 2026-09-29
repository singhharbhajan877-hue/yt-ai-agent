# Architecture – YT AI Agent

## High-level Overview

```
┌─────────────┐     OAuth 2.0      ┌──────────────────┐
│   Browser   │ ◄───────────────► │  Next.js (App)   │
│  Dashboard  │   JWT Sessions    │  API Routes      │
└─────────────┘                   └────────┬─────────┘
                                           │
                     ┌─────────────────────┼─────────────────────┐
                     │                     │                     │
                     ▼                     ▼                     ▼
              ┌────────────┐        ┌────────────┐        ┌────────────┐
              │ PostgreSQL │        │   Redis    │        │  Gemini /  │
              │  (Prisma)  │        │  (BullMQ)  │        │  Whisper   │
              └────────────┘        └─────┬──────┘        └────────────┘
                                          │
                                          ▼
                                   ┌────────────┐
                                   │   Worker   │
                                   │  (Node.js) │
                                   └─────┬──────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
             ┌────────────┐       ┌────────────┐       ┌────────────┐
             │  FFmpeg    │       │ YouTube    │       │  Storage   │
             │  Rendering │       │ Data API   │       │ (local/S3) │
             └────────────┘       └────────────┘       └────────────┘
```

## Core Flows

### 1. Connect YouTube Channel
1. User clicks "Connect YouTube".
2. Redirect to Google OAuth with scopes:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.readonly`
   - `https://www.googleapis.com/auth/youtube`
3. Callback stores encrypted tokens in `YouTubeChannel`.
4. Channel metadata synced via `channels.list`.

### 2. AI Command → Project
1. User types natural language command in Command Box.
2. `/api/commands` parses intent with Gemini (structured output).
3. Creates `Project` + one or more `Job` records.
4. Jobs are enqueued to BullMQ.
5. Worker picks jobs, updates status, writes results.

### 3. Shorts Pipeline (example)
1. `TRANSCRIBE` / `ANALYZE` – extract transcript + detect moments.
2. `GENERATE_SHORTS` – FFmpeg crop 9:16, auto-zoom, captions.
3. `GENERATE_THUMBNAIL` + `GENERATE_SEO`.
4. `UPLOAD_YOUTUBE` – official `videos.insert` (resumable).

### 4. Long-form Pipeline
1. Research + script generation (Gemini).
2. Chapter breakdown + voiceover (TTS placeholder).
3. B-roll / image generation hooks (extensible).
4. Assembly with FFmpeg → export → upload.

## Security

- OAuth tokens encrypted at rest (application-level or KMS).
- JWT for session; short-lived access tokens.
- Rate limiting on all public APIs.
- CSRF protection on state-changing routes.
- Secrets only via environment variables.
- Users can only operate on their own channels and media.

## Scalability Notes

- Stateless Next.js app → horizontal scaling.
- Workers can be scaled independently; use concurrency controls for FFmpeg/GPU.
- Redis for queues + optional caching of analytics.
- Object storage (S3-compatible) for rendered assets in production.
