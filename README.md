# YT AI Agent — Autonomous YouTube AI SaaS

Paste a command (with or without a YouTube URL). The agent downloads, analyzes, generates Shorts or long-form packages, SEO, thumbnails, previews, checks copyright risk, and uploads via the **official YouTube Data API v3** after your approval. Optional 24/7 workers handle queues, retries, comment replies, and analytics tips.

**Repo:** https://github.com/singhharbhajan877-hue/yt-ai-agent

## Commands you can type

```
Create 5 Shorts from https://youtube.com/watch?v=...
Create a 15-minute educational video about quantum computing
Generate a 10 min documentary about ancient Rome
```

- **With URL** → yt-dlp download → Gemini viral moments → FFmpeg Shorts → SEO → preview → approve upload  
- **Text only** → full long-form production package (script, chapters, visual prompts, SEO, preview card)

## Autonomous features

| Feature | Status |
|---------|--------|
| 24/7 workers (BullMQ + Redis) | ✅ |
| Multi-channel YouTube OAuth | ✅ |
| URL → Shorts pipeline | ✅ |
| Text → long-form package (5–30 min) | ✅ |
| SEO + chapters + tags + hashtags | ✅ |
| Thumbnail prompts | ✅ |
| Preview + one-click / scheduled upload | ✅ |
| Upload retries (5× exponential backoff) | ✅ |
| Copyright risk scan before upload | ✅ |
| Auto-reply to comments (Gemini + API) | ✅ |
| Analytics sync + growth recommendations | ✅ |
| Credits + Stripe subscriptions | ✅ |
| Admin dashboard + user list | ✅ |
| Progress bar + job history | ✅ |
| Docker (FFmpeg + yt-dlp) | ✅ |

## Run locally

```bash
git clone https://github.com/singhharbhajan877-hue/yt-ai-agent.git
cd yt-ai-agent && cp .env.example .env
# Set GOOGLE_*, GEMINI_API_KEY, NEXTAUTH_SECRET, DATABASE_URL, REDIS_URL

docker compose -f docker/docker-compose.yml up -d
npm install
npx prisma db push --schema=database/prisma/schema.prisma
npx prisma generate --schema=database/prisma/schema.prisma
npm run dev
npm run worker   # keep running 24/7 in production
```

## Production (always-on)

```bash
docker compose -f docker/docker-compose.prod.yml up --build -d
```

Run **worker** as a long-lived process (Railway/Render/Fly) so queues process around the clock.

## Important limits

- **Generative video frames** (photoreal B-roll, lip-sync narration) need external models (Veo, TTS APIs, image models). This repo produces complete **scripts, chapters, visual prompts, FFmpeg Shorts from your sources**, and official uploads.
- Copyright check is **advisory**, not legal clearance.
- Only process content you own or are licensed to use.

## License

MIT
