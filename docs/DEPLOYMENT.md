# Production Deployment Guide – YT AI Agent

This app is a **multi-service** system. You cannot run only the Next.js frontend in production and expect downloads, FFmpeg, or uploads to work. You need:

1. **Web app** (Next.js) – Vercel, Railway, or Render  
2. **Worker** (Node + FFmpeg + yt-dlp) – Railway, Render, or Fly.io (always-on)  
3. **PostgreSQL** – Neon, Supabase, Railway  
4. **Redis** – Upstash or Railway  
5. **Google OAuth + YouTube Data API** – Google Cloud Console  
6. **Gemini API key** – Google AI Studio  

There is no public live URL until **you** deploy with **your** secrets.

---

## Step 1 – Google Cloud (required)

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project.
3. Enable **YouTube Data API v3**.
4. **APIs & Services → OAuth consent screen**
   - User type: External (or Internal for Workspace).
   - App name: YT AI Agent.
   - Scopes:
     - `openid`, `email`, `profile`
     - `https://www.googleapis.com/auth/youtube.upload`
     - `https://www.googleapis.com/auth/youtube.readonly`
     - `https://www.googleapis.com/auth/youtube`
5. **Credentials → Create OAuth client ID → Web application**
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://YOUR_PRODUCTION_DOMAIN`
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://YOUR_PRODUCTION_DOMAIN/api/auth/callback/google`
6. Copy **Client ID** and **Client Secret**.

## Step 2 – Gemini API key

1. [Google AI Studio](https://aistudio.google.com/) → Get API key.  
2. Save as `GEMINI_API_KEY`.

## Step 3 – Database & Redis

**PostgreSQL (Neon example)**  
- Create project → copy connection string → `DATABASE_URL`.

**Redis (Upstash example)**  
- Create database → copy Redis URL → `REDIS_URL`.

## Step 4 – Deploy the web app (Vercel)

1. Push repo to GitHub (already done: `singhharbhajan877-hue/yt-ai-agent`).
2. [vercel.com](https://vercel.com) → New Project → import this repo.
3. **Root Directory:** leave default **or** set to `frontend` if you configure as single package.  
   Recommended for this monorepo:
   - Root: repository root  
   - Build command: `cd frontend && npm install && npx prisma generate --schema=../database/prisma/schema.prisma && npm run build`  
   - Output: `frontend/.next`  
   - Install: `npm install`
4. Environment variables (Production):

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://YOUR_VERCEL_DOMAIN
NEXTAUTH_URL=https://YOUR_VERCEL_DOMAIN
NEXTAUTH_SECRET=long-random-string-at-least-32-chars
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://YOUR_VERCEL_DOMAIN/api/auth/callback/google
GEMINI_API_KEY=...
STORAGE_PATH=/tmp/storage
```

Optional:

```env
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_AGENCY=
DEFAULT_MUSIC_PATH=
```

5. Deploy → note the URL, e.g. `https://yt-ai-agent-xxx.vercel.app`.
6. Add that exact URL to Google OAuth redirect URIs.

**Run migrations once** (from your machine or a one-off job):

```bash
DATABASE_URL="your-prod-url" npx prisma db push --schema=database/prisma/schema.prisma
```

## Step 5 – Deploy the worker (Railway or Render) — required

The worker must stay online 24/7.

### Railway

1. New project → Deploy from GitHub → same repo.  
2. Add service with Dockerfile: `docker/Dockerfile.worker`.  
3. Same env vars as above (`DATABASE_URL`, `REDIS_URL`, `GOOGLE_*`, `GEMINI_API_KEY`, `STORAGE_PATH=/data/storage`).  
4. Attach a volume for `/data/storage` if possible.  
5. Start command is already in the Dockerfile: worker process.

### Render

1. New **Background Worker**.  
2. Dockerfile path: `docker/Dockerfile.worker`.  
3. Same environment variables.  
4. Persist disk for storage if available.

Without a running worker: commands queue jobs but **never process** (no download, no FFmpeg, no upload).

## Step 6 – Verify end-to-end (checklist)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open production URL | Landing page loads |
| 2 | Sign in with Google | Redirects to dashboard |
| 3 | Settings → Connect YouTube | Channel appears |
| 4 | Command: text-only long video | Project created, credits drop, jobs appear |
| 5 | Worker logs | `generate_long` / `generate_seo` complete |
| 6 | Project page | Progress → PREVIEW |
| 7 | Command with **your** video URL | Download → analyze → Shorts (needs worker + yt-dlp) |
| 8 | Approve upload | Official YouTube upload (needs real file + channel) |
| 9 | Auto-reply / analytics | Jobs queue from Settings |
| 10 | Billing | Stripe or demo plan activation |

## Step 7 – Promote yourself to admin

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';
```

Then open `/dashboard/admin`.

---

## What I (the AI assistant) cannot do for you

- Create or bill a Vercel/Railway account in your name  
- Obtain your Google Client Secret or Gemini key  
- Host a permanent public URL on xAI infrastructure  
- Guarantee YouTube accepts every upload (quotas, ownership, copyright)  

After you deploy, **your** live URL will look like:

`https://<project-name>.vercel.app`  
or your custom domain.

---

## Quick local “full stack” test before cloud

```bash
docker compose -f docker/docker-compose.yml up -d
npm install
npx prisma db push --schema=database/prisma/schema.prisma
npx prisma generate --schema=database/prisma/schema.prisma
# fill .env with real Google + Gemini keys
npm run dev
npm run worker
```

Open http://localhost:3000 and run the verification checklist above.
