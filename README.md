# YT AI Agent

**Production-oriented AI SaaS** that connects to a user's YouTube channel via official Google OAuth 2.0 + YouTube Data API v3 and automates content creation, editing, SEO, scheduling, analytics, and uploading.

> Uses **only official Google/YouTube APIs**. Users may only process and upload content they own or have permission to use.

**Repo:** https://github.com/singhharbhajan877-hue/yt-ai-agent

## Status (current)

| Feature | Status |
|---------|--------|
| Google OAuth + YouTube scopes | ✅ Working |
| Connect / refresh YouTube channel | ✅ Working |
| AI Command Box (Gemini intent parse) | ✅ Working |
| Project + Job creation + BullMQ enqueue | ✅ Working |
| Worker: analyze / shorts / long / SEO / thumbnail | ✅ Implemented |
| FFmpeg Shorts crop (when source file present) | ✅ Implemented |
| Long-form script + chapters (Gemini) | ✅ Implemented |
| Official YouTube upload (videos.insert) | ✅ Implemented |
| Dashboard, Projects, Library, Settings | ✅ Working |
| Billing (Stripe checkout + demo mode) | ✅ Working |
| Admin panel (role-gated) | ✅ Working |
| Docker (dev + prod compose) | ✅ Ready |
| GitHub Actions CI | ✅ Ready |

## Quick Start

```bash
git clone https://github.com/singhharbhajan877-hue/yt-ai-agent.git
cd yt-ai-agent
cp .env.example .env
# Fill GOOGLE_*, GEMINI_API_KEY, NEXTAUTH_SECRET, DATABASE_URL, REDIS_URL

docker compose -f docker/docker-compose.yml up -d   # Postgres + Redis
npm install
npx prisma migrate dev --schema=database/prisma/schema.prisma
npx prisma generate --schema=database/prisma/schema.prisma

npm run dev          # Next.js → http://localhost:3000
npm run worker       # background jobs
```

1. Sign in with Google (YouTube scopes requested).
2. Dashboard → Settings → **Connect YouTube Channel**.
3. Type a command, e.g. `Create a 10-minute educational video about climate change`.
4. Watch projects & jobs update; upload finished videos from Library.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Environment

See [.env.example](.env.example). Critical variables:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `NEXTAUTH_SECRET`
- `GEMINI_API_KEY`
- `DATABASE_URL` / `REDIS_URL`
- `STRIPE_*` (optional – demo mode without them)

## Production

```bash
docker compose -f docker/docker-compose.prod.yml up --build -d
```

Or deploy frontend to Vercel and worker + Postgres + Redis to Railway/Render.

Full guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## License

MIT
