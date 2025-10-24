// app/api/summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  // Calculate streaks
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

  // Calculate longest win streak
  let maxWinStreak = 0;
  let tempStreak = 0;
  for (const r of rows) {
    if (r.status === 1) {
      tempStreak++;
      maxWinStreak = Math.max(maxWinStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  let heuristic = "📊 No games found in the last 7 days.\n\nPlay some chess to see your performance metrics!";
  
  if (total > 0 && top && low) {
    // Build time control breakdown
    const tcBreakdown = arr
      .map(t => `  • ${t.k}: ${t.w}W-${t.d}D-${t.l}L (${(t.wr * 100).toFixed(1)}% WR, ${t.g} games)`)
      .join('\n');

    // Performance rating
    let perfRating = "Struggling";
    if (winRate >= 0.60) perfRating = "Excellent";
    else if (winRate >= 0.50) perfRating = "Good";
    else if (winRate >= 0.40) perfRating = "Average";

    // Time control specific tip
    let tcTip = "";
    if (top.k === "bullet") {
      tcTip = "Bullet tip: Pre-move when pieces are forced, keep pieces active.";
    } else if (top.k === "blitz") {
      tcTip = "Blitz tip: Play fast in the opening, slow down for tactics.";
    } else if (top.k === "rapid") {
      tcTip = "Rapid tip: Use your time wisely—calculate critical positions.";
    }

    heuristic =
      `♟️ Chess Performance Summary (Last 7 Days)\n\n` +
      `📈 Overall Record: ${wins}W-${draws}D-${losses}L\n` +
      `   Win Rate: ${(winRate * 100).toFixed(1)}% (${perfRating})\n\n` +
      `🎯 By Time Control:\n${tcBreakdown}\n\n` +
      `🔥 Current Streak: ${currentStreak} ${streakType}${currentStreak !== 1 ? 's' : ''}\n` +
      `🏆 Best Win Streak: ${maxWinStreak} game${maxWinStreak !== 1 ? 's' : ''}\n\n` +
      `💡 Quick Insights:\n` +
      `   Strongest: ${top.k} (${(top.wr * 100).toFixed(1)}% WR)\n` +
      `   Needs Work: ${low.k} (${(low.wr * 100).toFixed(1)}% WR)\n` +
      `   ${tcTip}`;
  }

  return NextResponse.json({ 
    insight: heuristic, 
    source: "local" 
  }, { status: 200 });
}