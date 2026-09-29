# Environment variable checklist

Copy into Vercel + Worker. Never commit real values.

## Required for basic auth + dashboard

| Variable | Where |
|----------|--------|
| `NEXTAUTH_SECRET` | Web |
| `NEXTAUTH_URL` | Web (must match public URL) |
| `NEXT_PUBLIC_APP_URL` | Web |
| `GOOGLE_CLIENT_ID` | Web + Worker |
| `GOOGLE_CLIENT_SECRET` | Web + Worker |
| `DATABASE_URL` | Web + Worker |
| `REDIS_URL` | Web + Worker |

## Required for AI + media pipeline

| Variable | Where |
|----------|--------|
| `GEMINI_API_KEY` | Web + Worker |
| `STORAGE_PATH` | Worker (e.g. `/data/storage`) |

## Optional

| Variable | Purpose |
|----------|--------|
| `STRIPE_*` | Real billing |
| `DEFAULT_MUSIC_PATH` | BG music for Shorts |
| `WHISPER_*` | Future transcription |
| `RAZORPAY_*` | India payments |

Generate secrets:

```bash
openssl rand -base64 32   # NEXTAUTH_SECRET
```
