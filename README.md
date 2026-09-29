# YT AI Agent

**AI SaaS for YouTube creators** — paste a YouTube URL + one command, and the agent downloads, analyzes, cuts viral Shorts, adds effects/subtitles, generates SEO + thumbnails, shows a preview, and uploads via the **official YouTube Data API v3** after your one-click approval.

**Repo:** https://github.com/singhharbhajan877-hue/yt-ai-agent

> **Compliance:** Official Google OAuth 2.0 + YouTube Data API only. Process only content you own or have rights to use.

## End-to-end pipeline

```
YouTube URL + command
        ↓
   yt-dlp download (video + auto-subs)
        ↓
   Gemini analysis (viral moments, tone, chapters)
        ↓
   FFmpeg Shorts (9:16 crop, zoom, color, subtitles, music mix)
        ↓
   SEO (title, description, tags, hashtags) + thumbnail prompt
        ↓
   Preview page + progress bar + job history
        ↓
   One-click approve / schedule → official videos.insert upload
```

## Features

| Feature | Status |
|---------|--------|
| Google OAuth + YouTube channel connect | ✅ |
| yt-dlp download of source video | ✅ |
| Gemini viral moment detection | ✅ |
| FFmpeg 9:16 Shorts (crop, zoom, color, denoise-ish, burn-in subs) | ✅ |
| Background music mix (optional `DEFAULT_MUSIC_PATH`) | ✅ |
| Long-form script generation | ✅ |
| SEO title / description / tags / hashtags | ✅ |
| Thumbnail prompt generation | ✅ |
| Progress bar + job history | ✅ |
| Preview + one-click approve upload | ✅ |
| Scheduled upload (`publishAt`) | ✅ |
| Credits system + deduction | ✅ |
| Stripe billing | ✅ |
| Admin panel | ✅ |
| Docker (FFmpeg + yt-dlp in worker) | ✅ |

## Quick start

```bash
git clone https://github.com/singhharbhajan877-hue/yt-ai-agent.git
cd yt-ai-agent
cp .env.example .env
# Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET,
#           GEMINI_API_KEY, DATABASE_URL, REDIS_URL

docker compose -f docker/docker-compose.yml up -d
npm install

# Apply schema (credits, progress, new statuses)
npx prisma db push --schema=database/prisma/schema.prisma
npx prisma generate --schema=database/prisma/schema.prisma

npm run dev       # http://localhost:3000
npm run worker    # must run for downloads / FFmpeg / uploads
```

**Local tools for worker (if not using Docker worker):**

```bash
# macOS
brew install ffmpeg yt-dlp
# or: pip install yt-dlp
```

### Usage flow

1. Sign in with Google (grant YouTube scopes).
2. **Settings → Connect YouTube Channel**.
3. Dashboard command example:

   `Create 5 Shorts from https://www.youtube.com/watch?v=YOUR_VIDEO`

4. Open the project page — watch progress (download → analyze → render).
5. When status is **PREVIEW**, review clips and click **Approve & Upload** (or set a schedule time).

## Credits

| Action | Cost |
|--------|------|
| Shorts pipeline (with URL) | 10 |
| Long-form generation | 25 |
| New users | 50 free credits |

Top up via **Billing** (Stripe or demo mode).

## Environment extras

```env
DEFAULT_MUSIC_PATH=/path/to/royalty-free-bed.mp3   # optional BG music for Shorts
STORAGE_PATH=./storage
```

## Production

```bash
docker compose -f docker/docker-compose.prod.yml up --build -d
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Limitations (honest)

- **Face tracking / emoji stickers / auto B-roll** beyond center-weighted crop + zoom require extra ML models (MediaPipe, etc.) — structure supports adding them.
- **AI image thumbnails** produce optimized prompts; wire Imagen/Flux for PNG output.
- **True noise reduction** uses FFmpeg `unsharp`/`eq`; professional denoise needs `afftdn` or RNNoise builds.
- Always respect copyright: only process videos you own or are licensed to edit.

## License

MIT
