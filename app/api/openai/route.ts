// app/api/openai/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const player = url.searchParams.get("player") || undefined;

  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const where: Prisma.EventWhereInput = {
    service: "chess",
    createdAt: { gte: since },
    ...(player ? { player } : {}),
  };

  const rows = await prisma.event.findMany({
    where,
    select: { createdAt: true, route: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  const total = rows.length;
  const wins = rows.filter((r) => r.status === 1).length;
  const draws = rows.filter((r) => r.status === 0).length;
  const losses = rows.filter((r) => r.status === -1).length;
  const winRate = total ? wins / total : 0;

  // By time control
  const byTc: Record<string, { g: number; w: number; d: number; l: number }> = {};
  for (const r of rows) {
    const k = (r.route || "/unknown").replace("/", "");
    byTc[k] ||= { g: 0, w: 0, d: 0, l: 0 };
    byTc[k].g += 1;
    if (r.status === 1) byTc[k].w += 1;
    if (r.status === 0) byTc[k].d += 1;
    if (r.status === -1) byTc[k].l += 1;
  }
  
  const arr = Object.entries(byTc)
    .map(([k, v]) => ({ 
      k, 
      wr: v.g ? v.w / v.g : 0, 
      g: v.g,
      w: v.w,
      d: v.d,
      l: v.l
    }))
    .sort((a, b) => b.g - a.g);

  const top = arr[0];
  const low = [...arr].sort((a, b) => a.wr - b.wr)[0];
  
  // Calculate win streak
  let currentStreak = 0;
  let streakType = "none";
  for (let i = rows.length - 1; i >= 0; i--) {
    if (streakType === "none") {
      if (rows[i].status === 1) {
        streakType = "win";
        currentStreak = 1;
      } else if (rows[i].status === -1) {
        streakType = "loss";
        currentStreak = 1;
      }
    } else if (
      (streakType === "win" && rows[i].status === 1) ||
      (streakType === "loss" && rows[i].status === -1)
    ) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Chess-focused heuristic fallback
  const best = top ? { tc: top.k, wr: top.wr, games: top.g } : null;
  const worst = low ? { tc: low.k, wr: low.wr } : null;

  let heuristic = "No games found in the last 7 days. Play some games to see insights!";
  
  if (total > 0 && best && worst) {
    // Time control specific advice
    let tcAdvice = "";
    if (best.tc === "bullet") {
      tcAdvice = "In bullet, focus on pre-moves in obvious positions and maintain piece activity over material.";
    } else if (best.tc === "blitz") {
      tcAdvice = "In blitz, prioritize fast opening development and avoid complicated tactics under time pressure.";
    } else if (best.tc === "rapid") {
      tcAdvice = "In rapid, take time to calculate tactical sequences and avoid impulsive moves in the middlegame.";
    } else {
      tcAdvice = `Your strongest format is ${best.tc}—continue playing this to maximize rating gains.`;
    }

    heuristic =
      `♟️ Chess Performance (Last 7 Days)\n\n` +
      `Record: ${wins}W-${draws}D-${losses}L (${(winRate * 100).toFixed(1)}% win rate)\n` +
      `Most played: ${best.tc} (${best.games} games, ${(best.wr * 100).toFixed(1)}% WR)\n` +
      `Weakest format: ${worst.tc} (${(worst.wr * 100).toFixed(1)}% WR)\n` +
      `Current streak: ${currentStreak} ${streakType === "win" ? "wins" : "losses"}\n\n` +
      `💡 Chess-Specific Tips:\n` +
      `${tcAdvice}\n\n` +
      `Focus on your strongest time control (${best.tc}) for rating gains. Review your last 3 losses in ${worst.tc} to identify tactical patterns.`;
  }

  // Check for OpenAI credentials
  const { OPENAI_API_KEY, OPENAI_ORG, OPENAI_PROJECT } = process.env;
  if (!OPENAI_API_KEY || !OPENAI_ORG || !OPENAI_PROJECT) {
    return NextResponse.json({ insight: heuristic, source: "heuristic" }, { status: 200 });
  }

  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
      organization: OPENAI_ORG,
      project: OPENAI_PROJECT,
    });

    const timeControlBreakdown = arr
      .map(t => `${t.k}: ${t.w}W-${t.d}D-${t.l}L (${(t.wr * 100).toFixed(1)}%)`)
      .join(", ");

    const prompt =
      `You are an expert chess coach analyzing a player's recent performance. Be specific about chess concepts.\n\n` +
      `Data (Last 7 Days):\n` +
      `Total: ${total} games (${wins}W-${draws}D-${losses}L, ${(winRate * 100).toFixed(1)}% win rate)\n` +
      `Time Controls: ${timeControlBreakdown}\n` +
      `Current Streak: ${currentStreak} ${streakType}${currentStreak > 1 ? 's' : ''}\n\n` +
      `Provide exactly 3 chess-focused insights (max 150 words total):\n` +
      `1. Performance pattern - mention specific time control strengths/weaknesses\n` +
      `2. Strategic advice - reference opening preparation, tactical awareness, time management, or endgame technique\n` +
      `3. Actionable training recommendation - be specific (e.g., "practice rook endgames", "review Sicilian Defense lines", "solve 20 tactics puzzles daily")`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a chess coach. Focus on chess-specific concepts: openings, tactics, strategy, time management, endgames. Keep responses under 150 words with 3 clear points." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 300,
    });

    const insight = completion.choices[0]?.message?.content?.trim() || heuristic;
    return NextResponse.json({ insight, source: "openai" }, { status: 200 });
    
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json({ insight: heuristic, source: "heuristic" }, { status: 200 });
  }
}