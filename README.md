This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Chess Telemetry Insights ♟️ — Full-Stack Chess Performance Dashboard

A full-stack analytics web app that ingests Chess.com gameplay data, stores telemetry, and visualizes performance trends with KPIs, charts, and concise weekly summaries. Works out-of-the-box with any Chess.com username and supports local or OpenAI-powered insights.

## 🚀 Live Demo
App: [https://chess-telemetry-insights-jhis-hdijy5sa0.vercel.app](https://chess-telemetry-insights-jhis-hdijy5sa0.vercel.app)  
Repo: [https://github.com/Muuustafaa03/chess-telemetry-insights](https://github.com/Muuustafaa03/chess-telemetry-insights)

## 🧠 Features
- Automatic data ingestion: Pulls recent Chess.com games and stores them in PostgreSQL.  
- Interactive analytics: 7-day KPIs, 30-day game volume, and 60-day win-rate charts by time control.  
- AI or local summaries: Generates concise weekly insights using a heuristic engine or OpenAI Responses API.  
- Multi-player support: Filter dashboard data by any player.  
- One-click deploy: Built with Vercel + Railway for instant full-stack hosting.

## 🧱 Tech Stack
Layer | Technologies  
------|---------------  
Frontend | Next.js 15 · React 19 · TypeScript · TailwindCSS · Recharts  
Backend | Prisma ORM · Node.js  
Database | PostgreSQL (Railway)  
Infra / Hosting | Vercel (web) · Railway (database)  
Optional AI | OpenAI Responses API (gpt-4o-mini)

## ⚙️ Local Setup
1️⃣ Clone and install  
git clone https://github.com/Muuustafaa03/chess-telemetry-insights  
cd chess-telemetry-insights  
npm install  

2️⃣ Set up your environment  
Copy the example file and fill in your credentials:  
cp env.example .env  

Inside `.env`, set your Railway database URL (external connection string):  
DATABASE_URL="postgresql://user:password@host:port/railway?sslmode=require"  

3️⃣ Run migrations  
npx prisma migrate dev  

## ♟️ Uploading Your Own Chess Data
You can ingest your own Chess.com games into the dashboard with a single command.  

Find your Chess.com username (case-insensitive). Example: magnuscarlsen  

Run:  
npx ts-node scripts/ingest_chess.ts <your_username>  
Example:  
npx ts-node scripts/ingest_chess.ts magnuscarlsen  

The script will:  
- Fetch your recent games from the Chess.com API  
- Store them as telemetry events in your PostgreSQL database  
- Print how many were added  
- Populate your dashboard instantly on refresh  

Re-run this anytime to pull new data.

## 🔌 Optional: Enable AI Insights
Add the following to `.env`:  
OPENAI_API_KEY="sk-..."  
OPENAI_ORG="org_..."  
OPENAI_PROJECT="proj_..."  

Use the `/api/openai` endpoint (already included in the project). If not configured, the dashboard automatically uses local summaries.

## ☁️ Deploying to the Cloud
Vercel (Frontend):  
1. Push your project to GitHub.  
2. Go to vercel.com → “Add New Project” → import your repo.  
3. Add DATABASE_URL (from Railway) as an Environment Variable.  
4. Click Deploy — your app builds and goes live instantly.  

Railway (Database):  
1. Create a PostgreSQL service.  
2. Enable External Connection and copy the connection string.  
3. Use that string in both local and Vercel `.env` (?sslmode=require).  

## 📊 Project Structure
app/
  api/
    summary/route.ts    # always-available local insights
    openai/route.ts     # optional OpenAI-powered insights
components/
  PlayerSelect.tsx
  Stats.tsx
  SummaryCard.tsx
lib/
  prisma.ts             # Prisma client
prisma/
  schema.prisma         # Event model
scripts/
  ingest_chess.ts       # Chess.com ingestion script


## 🧭 Future Roadmap
- Extend telemetry to other games (Clash Royale, Pokémon TCG)  
- Add leaderboards and personalized accounts  
- Integrate live performance streaming or coaching suggestions  

## 📝 License
MIT License © 2025 Mustafa Ahmed







