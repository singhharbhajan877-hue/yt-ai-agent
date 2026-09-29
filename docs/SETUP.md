# Setup Guide – YT AI Agent

## 1. Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select existing).
3. Enable **YouTube Data API v3**.
4. Configure **OAuth consent screen**:
   - User type: External (or Internal for Workspace).
   - Add scopes:
     - `.../auth/youtube.upload`
     - `.../auth/youtube.readonly`
     - `.../auth/youtube`
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
5. Create **OAuth 2.0 Client ID** (Web application).
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` (and production URL).
6. Copy Client ID + Client Secret into `.env`.

## 2. Gemini API

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Create API key.
3. Set `GEMINI_API_KEY` in `.env`.

## 3. Local Services

```bash
# Start Postgres + Redis
docker compose -f docker/docker-compose.yml up -d postgres redis

# Install deps
npm install

# Prisma
npx prisma migrate dev --schema=database/prisma/schema.prisma
npx prisma generate --schema=database/prisma/schema.prisma
```

## 4. Run

```bash
npm run dev          # Next.js on :3000
npm run worker       # background jobs
```

## 5. First Login

1. Open http://localhost:3000
2. Sign in with Google
3. Go to Settings → Connect YouTube Channel
4. Authorize the requested scopes
5. You should see the channel on the Dashboard

## Production Checklist

- [ ] Rotate all secrets
- [ ] Use managed Postgres + Redis
- [ ] Enable HTTPS only
- [ ] Encrypt OAuth tokens at rest
- [ ] Configure Stripe/Razorpay webhooks
- [ ] Set up object storage for media
- [ ] Restrict CORS and rate limits
- [ ] Enable monitoring (Sentry, etc.)
