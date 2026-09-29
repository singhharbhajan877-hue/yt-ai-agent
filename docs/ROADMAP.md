# Roadmap & Feature Status

## ✅ Implemented in this scaffold

- Monorepo structure (frontend / worker / database / docker / docs)
- Full Prisma schema (users, channels, projects, videos, jobs, analytics, subscriptions)
- Next.js 15 app with landing + dashboard shell
- Google OAuth + YouTube scopes configuration
- Gemini command parser + script / SEO helpers
- Official YouTube client helpers (`videos.insert`, thumbnails)
- BullMQ workers skeleton (media, upload, analytics)
- Docker Compose for Postgres + Redis
- API contract documentation
- Deployment & setup guides

## 🚧 Next implementation priorities

1. **Auth completion** – wire NextAuth routes, protect dashboard, store channel tokens encrypted
2. **Command API** – `/api/commands` that creates Project + enqueues jobs
3. **Real transcription** – Whisper integration
4. **FFmpeg pipelines** – basic Shorts (9:16 crop + captions) and silence removal
5. **Resumable upload** – complete official YouTube upload with progress
6. **Stripe / Razorpay** – subscription plans and webhooks
7. **Admin panel** – basic user / job overview
8. **Thumbnail generation** – Gemini image or external model
9. **Analytics sync** – pull channel stats daily
10. **Content calendar UI**

## 🔮 Advanced (future)

- Full long-form video assembly with AI B-roll
- Face / object tracking effects
- Multi-language voiceover
- 4K export pipeline
- GPU worker fleet
- Team / agency multi-seat plans

Contributions and PRs welcome once the core command → job → upload loop is solid.
