# Deployment Guide

## Recommended Stacks

| Component | Suggested Service |
|-----------|-------------------|
| App (Next.js) | Vercel or Railway |
| Worker | Railway / Render (always-on) |
| PostgreSQL | Neon / Supabase / Railway |
| Redis | Upstash / Redis Cloud / Railway |
| Object Storage | Cloudflare R2 / AWS S3 |
| Domain + SSL | Vercel / Cloudflare |

## Environment Variables

Copy all keys from `.env.example` into the platform secrets. Critical ones:

- `DATABASE_URL`
- `REDIS_URL`
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `GEMINI_API_KEY`
- Payment keys if enabling billing

## Google OAuth Production

1. Add production redirect URI: `https://yourdomain.com/api/auth/callback/google`
2. Publish OAuth consent screen (or keep in testing with test users).
3. Verify branding if required for sensitive scopes.

## Database Migrations

```bash
npx prisma migrate deploy --schema=database/prisma/schema.prisma
```

## GitHub Actions

A basic CI workflow is included under `.github/workflows/ci.yml`.
It runs typecheck and lint on pull requests.

## Scaling Workers

- Increase BullMQ concurrency carefully (FFmpeg is CPU/GPU heavy).
- Use separate queues for media vs upload vs analytics.
- Consider GPU instances only for video-generation jobs when `ENABLE_VIDEO_GENERATION=true`.
