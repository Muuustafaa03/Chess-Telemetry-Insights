# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chess Telemetry Insights is a full-stack Next.js application that analyzes Chess.com player performance data. It fetches game history, stores it in PostgreSQL, and generates interactive visualizations with optional AI-powered insights.

**Key architecture pattern**: Web-based ingestion eliminates user setup. Users enter a Chess.com username, the app fetches their games via Chess.com's public API, processes them server-side, and displays analytics instantly.

## Development Commands

```bash
# Development server (hot reload at http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server (requires build first)
npm start

# Linting
npm run lint

# Database commands
npx prisma migrate dev          # Create and apply migrations
npx prisma generate             # Regenerate Prisma client after schema changes
npx prisma studio               # Open database GUI at http://localhost:5555
npx prisma db push              # Push schema without migrations (development only)
```

## Environment Setup

Required environment variables in `.env`:

```bash
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"  # Required
OPENAI_API_KEY="sk-..."        # Optional (enables AI insights)
OPENAI_ORG="org_..."            # Optional
OPENAI_PROJECT="proj_..."       # Optional
```

Use `env.example` as a template. The app works without OpenAI credentials (falls back to heuristic summaries).

## Architecture

### Data Flow

1. **Ingestion**: `POST /api/ingest` fetches last 2 months of Chess.com games for a username
2. **Storage**: Games stored as `Event` records in PostgreSQL (deduplication by player/timestamp/time_control)
3. **Retrieval**: `app/page.tsx` server component queries database for 30-day and 60-day windows
4. **Visualization**: `Stats.tsx` renders Recharts (LineChart for daily trends, ComposedChart for time-control analysis)
5. **Insights**: `SummaryCard.tsx` fetches from either `/api/openai` (AI) or `/api/summary` (heuristic)

### Database Schema

Single `Event` model (see `prisma/schema.prisma`):

```prisma
model Event {
  id        String   @id @default(cuid())
  service   String   // Always "chess"
  type      String   // Always "request"
  route     String?  // Time control: "/bullet", "/blitz", "/rapid"
  status    Int?     // Win: 1, Draw: 0, Loss: -1
  createdAt DateTime // Game end timestamp
  player    String?  // Chess.com username (lowercase)
}
```

Indexes on `createdAt` and `player` for fast filtering.

### Key Components

- **`app/page.tsx`**: Server component. Queries database, aggregates stats (30d KPIs, 30d daily data, 60d time-control data), passes props to client components.
- **`components/PlayerSelect.tsx`**: Client component. Username input → calls `/api/ingest` → triggers page refresh with `?player=username` query param.
- **`components/Stats.tsx`**: Client component. Renders KPI cards and Recharts visualizations (requires `"use client"` for Recharts).
- **`components/SummaryCard.tsx`**: Client component. Fetches insights from OpenAI or heuristic endpoint based on availability.
- **`app/api/ingest/route.ts`**: Chess.com API integration. Fetches games, normalizes results, deduplicates, stores in database.
- **`app/api/openai/route.ts`**: Generates AI-powered insights using `gpt-4o-mini` (requires `OPENAI_API_KEY`).
- **`app/api/summary/route.ts`**: Heuristic fallback. Generates text summaries from game statistics.

### Prisma Best Practices

- **Always use the singleton client**: Import from `@/lib/prisma`, not `new PrismaClient()` (prevents connection exhaustion in serverless).
- **After schema changes**: Run `npx prisma generate` before restarting the dev server.
- **Type-safe queries**: Use `Prisma.EventWhereInput` for complex where clauses (see `app/page.tsx:25`).

### Chess.com API Integration

- **Rate limiting**: The API is rate-limited. The `getJson()` utility in `app/api/ingest/route.ts` implements retry logic with exponential backoff.
- **Result normalization**: Chess.com uses varied result strings ("win", "checkmated", "timeout", etc.). The `resultToStatus()` function maps these to `1` (win), `0` (draw), `-1` (loss).
- **Deduplication**: Games are deduplicated by `(player, createdAt, route)` before insertion (see `app/api/ingest/route.ts:100-107`).

## Common Development Patterns

### Adding a New Time Window

Example: Add a 7-day KPI card.

1. In `app/page.tsx`, create a new date filter:
   ```typescript
   const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
   const last7 = rows.filter((r) => r.createdAt >= since7);
   ```
2. Compute metrics from `last7` array.
3. Pass new props to `Stats.tsx`.
4. Add a new KPI card in `Stats.tsx` grid.

### Adding a New Visualization

Example: Show opening frequency chart.

1. Aggregate data in `app/page.tsx` server component (add `opening` field to `Event` schema if needed).
2. Pass aggregated data as prop to `Stats.tsx`.
3. Add a new Recharts chart (BarChart, PieChart, etc.) in `Stats.tsx`.
4. Use dark mode aware colors: `stroke="#3B82F6"` (blue), `stroke="#10B981"` (green), `stroke="#9CA3AF"` (gray).

### Modifying Ingestion Logic

- All Chess.com fetching logic is in `app/api/ingest/route.ts`.
- To ingest more months: Change `archives.slice(-2)` to `archives.slice(-N)` (line 83).
- To add new fields (e.g., opening moves): Update `Event` schema, run `npx prisma migrate dev`, modify the `prisma.event.create()` call.

## Deployment

- **Frontend + API**: Deploy to Vercel (zero-config Next.js deployment). Set environment variables in Vercel dashboard.
- **Database**: Railway PostgreSQL recommended (get connection string from Railway dashboard).
- **Critical**: Use `?sslmode=require` in `DATABASE_URL` for Railway connections.
- **Cold starts**: Vercel free tier has 1-2s cold starts for API routes. Consider upgrading or implementing connection pooling for production.

## Troubleshooting

### "User not found" errors
- Verify username exists on Chess.com (case-insensitive).
- Check Chess.com API status (rare outages).

### Database connection errors
- Verify `DATABASE_URL` includes `?sslmode=require` for Railway.
- Run `npx prisma generate` after pulling schema changes.
- Restart dev server after `.env` changes.

### Charts not rendering
- Recharts requires `"use client"` directive.
- Verify data shape matches chart's expected `dataKey` props.
- Check browser console for Recharts warnings.

### Missing insights
- Heuristic fallback activates if `OPENAI_API_KEY` is unset.
- OpenAI API errors (rate limits, quota) fall back gracefully (see `app/api/openai/route.ts:139`).

## Tech Stack Notes

- **Next.js 15 with App Router**: All pages are server components by default. Use `"use client"` only when needed (interactivity, browser APIs, Recharts).
- **Tailwind CSS v4**: Uses `@tailwind` directives in `globals.css`. Dark mode support via `dark:` variant.
- **TypeScript**: Strict mode enabled. Prisma generates types automatically.
- **React 19**: Supports async server components (see `app/page.tsx:12-16` for async `searchParams`).
