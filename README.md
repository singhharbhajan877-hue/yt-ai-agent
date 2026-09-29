# YT AI Agent

**Production-ready AI SaaS platform** that connects to a user's YouTube channel via official Google OAuth 2.0 + YouTube Data API v3 and automates content creation, editing, SEO, scheduling, analytics, and uploading.

> **Important**: This system uses **only official Google/YouTube APIs**. Users may only process and upload content they own or have explicit permission to use. No browser automation or YouTube Studio bypass is implemented.

## Features Overview

| Area | Capabilities |
|------|--------------|
| **Auth** | Google OAuth 2.0, YouTube channel connect, JWT sessions, multi-user |
| **AI Command Box** | Natural language commands ("Create 5 Shorts from this video", "Create a 20-min documentary", etc.) |
| **Shorts AI** | Moment detection, 9:16 crop, auto-zoom, captions, music, SEO, upload |
| **Long-form AI** | Script generation, chapters, voiceover, B-roll placeholders, multi-language |
| **Video Editor** | Cut/trim/merge, silence removal, transitions, color grading hooks |
| **SEO & Thumbnails** | AI titles, descriptions, tags, hashtags, CTR-optimized thumbnails |
| **Channel AI** | Analytics sync, content calendar, trending suggestions, upload plans |
| **Upload** | Private / Unlisted / Public / Scheduled via official YouTube Data API v3 |
| **Payments** | Stripe + Razorpay + UPI subscription plans |
| **Infra** | PostgreSQL + Prisma, Redis queues, Docker, GitHub Actions |

## Tech Stack

- **Frontend / Full-stack**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes + Node.js workers
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: Redis + BullMQ
- **AI**: Google Gemini API, Whisper (transcription), FFmpeg (media processing)
- **Auth**: Google OAuth 2.0 + JWT
- **YouTube**: Official `googleapis` YouTube Data API v3
- **Payments**: Stripe + Razorpay
- **Deploy**: Docker, Railway / Render / Vercel
- **CI/CD**: GitHub Actions

## Project Structure

```
yt-ai-agent/
├── frontend/                 # Next.js 15 App (UI + API routes)
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── prisma/
│   └── ...
├── worker/                   # Background job processors (BullMQ)
├── database/                 # Prisma schema, migrations, seed
├── docker/                   # Dockerfiles & compose
├── .github/workflows/        # CI/CD
├── docs/                     # Architecture, API, deployment guides
├── package.json              # Root workspace
└── README.md
```

## Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (or use Docker)
- Redis (or use Docker)
- Google Cloud project with YouTube Data API v3 + OAuth consent screen
- Gemini API key

### 1. Clone & Install

```bash
git clone https://github.com/singhharbhajan877-hue/yt-ai-agent.git
cd yt-ai-agent
npm install
```

### 2. Environment

```bash
cp .env.example .env
# Fill in all required values (see docs/SETUP.md)
```

### 3. Database

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Run with Docker (recommended)

```bash
docker compose -f docker/docker-compose.yml up --build
```

Or run services individually:

```bash
# Terminal 1 – Next.js
npm run dev

# Terminal 2 – Worker
npm run worker
```

App will be available at `http://localhost:3000`.

## Official API Compliance

- Authentication: Google OAuth 2.0 (authorized redirect URIs only)
- Video operations: YouTube Data API v3 (`videos.insert`, `thumbnails.set`, `playlists`, etc.)
- No headless browsers, no scraping of YouTube Studio, no unofficial clients for upload
- Users must own or have rights to any source media they process

## Documentation

| Document | Description |
|----------|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design & data flow |
| [docs/SETUP.md](docs/SETUP.md) | Detailed installation & Google Cloud setup |
| [docs/API.md](docs/API.md) | REST API reference |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment guides |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Feature status & planned work |

## License

MIT — see [LICENSE](LICENSE)

---

Built for creators who want an autonomous AI employee that respects platform rules and copyright.
