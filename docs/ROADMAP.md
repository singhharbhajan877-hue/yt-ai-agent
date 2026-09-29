# Roadmap & Feature Status

## ✅ Completed

- [x] Monorepo (frontend / worker / database / docker / docs)
- [x] Full Prisma schema
- [x] Google OAuth 2.0 + YouTube Data API scopes
- [x] Channel connect & token storage
- [x] AI Command Box + Gemini intent parsing
- [x] Project & Job lifecycle
- [x] BullMQ media + upload queues
- [x] Workers: analyze, generate_shorts, generate_long, generate_seo, generate_thumbnail, upload
- [x] FFmpeg 9:16 Shorts pipeline (when source file available)
- [x] Long-form script + chapter generation
- [x] SEO title/description/tags/hashtags
- [x] Thumbnail prompt generation
- [x] Official YouTube resumable upload path
- [x] Dashboard, Projects, Library, Settings, Analytics shell, Billing, Admin
- [x] Stripe checkout (with demo fallback)
- [x] Docker Compose (dev + prod) + Dockerfiles with FFmpeg
- [x] GitHub Actions CI
- [x] Error handling on API routes & workers

## 🔜 Recommended next steps

1. Wire Whisper transcription for real audio analysis of owned uploads
2. Connect an image model (Imagen / Flux) for real thumbnail PNGs
3. TTS voiceover for long-form scripts
4. Full FFmpeg assembly of long-form (images + voice + music)
5. Encrypt OAuth tokens at rest (AES / KMS)
6. Razorpay / UPI billing path for India
7. Automated analytics daily sync job
8. Unit + integration tests (Vitest / Playwright)
9. Rate limiting middleware
10. Content calendar UI

## Design constraints (enforced)

- Official Google OAuth + YouTube Data API v3 only
- No browser automation / YouTube Studio scraping
- Users process only content they own or have rights to
