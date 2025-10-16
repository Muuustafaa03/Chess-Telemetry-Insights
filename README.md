# Chess Telemetry Insights ♟️
a production-like dashboard that ingests events (API calls, errors, latency), stores them, visualizes trends, and adds an AI “Insights” panel that explains what changed and why.

Frontend: Next.js + React + Tailwind

Backend: Next.js API routes (Node/Express style) or a small Express server

DB: Postgres (Railway/Render free tier)

ORM: Prisma

Charts: Recharts

Auth (optional): NextAuth (GitHub provider)

AI: OpenAI API (insights summary)

Deploy: Vercel (frontend+API) + Railway (Postgres)
