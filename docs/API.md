# API Reference – YT AI Agent

Base URL: `/api`

All authenticated routes require a valid session (NextAuth JWT / cookie).

## Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/signin` | Start Google OAuth |
| GET | `/api/auth/callback/google` | OAuth callback |
| GET | `/api/auth/signout` | Sign out |
| GET | `/api/auth/session` | Current session |

## Commands

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/commands` | Submit natural-language command |

**Body**
```json
{
  "command": "Create 5 Shorts from https://youtube.com/watch?v=xxxx"
}
```

**Response**
```json
{
  "projectId": "clx...",
  "parsed": { "intent": "generate_shorts", "count": 5, ... },
  "jobs": ["job_id_1", "job_id_2"]
}
```

## Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List user projects |
| GET | `/api/projects/:id` | Project detail + jobs |
| POST | `/api/projects` | Create project (advanced) |
| DELETE | `/api/projects/:id` | Cancel / delete |

## Channels

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/channels` | List connected YouTube channels |
| POST | `/api/channels/connect` | Initiate extra channel connect |
| DELETE | `/api/channels/:id` | Disconnect channel |

## Videos

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/videos` | Video library |
| GET | `/api/videos/:id` | Video detail |
| POST | `/api/videos/:id/upload` | Trigger official YouTube upload |

## Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics` | Aggregated channel analytics |
| POST | `/api/analytics/sync` | Force sync from YouTube API |

## Admin (role=ADMIN)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List users |
| GET | `/api/admin/jobs` | Global job monitor |
| GET | `/api/admin/logs` | System logs |
