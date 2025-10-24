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
  const byTc: Record<string, { g: number; w: number }> = {};
  for (const r of rows) {
    const k = (r.route || "/unknown").replace("/", "");
    byTc[k] ||= { g: 0, w: 0 };
    byTc[k].g += 1;
    if (r.status === 1) byTc[k].w += 1;
  }
  
  const arr = Object.entries(byTc)
    .map(([k, v]) => ({ k, wr: v.g ? v.w / v.g : 0, g: v.g }))
    .sort((a, b) => b.g - a.g);

  const top = arr[0];
  const low = [...arr].sort((a, b) => a.wr - b.wr)[0];
  
  const best = top ? `${top.k} (${(top.wr * 100).toFixed(2)}% WR, ${top.g} games)` : "n/a";
  const worst = low ? `${low.k} (${(low.wr * 100).toFixed(2)}% WR)` : "n/a";

  const heuristic =
    `📊 Last 7 Days Performance:\n\n` +
    `• Played ${total} games: ${wins} wins, ${draws} draws, ${losses} losses (${(winRate * 100).toFixed(2)}% win rate)\n` +
    `• Highest volume: ${best}\n` +
    `• Weakest performance: ${worst}\n\n` +
    `💡 Recommendation:\n` +
    `Focus 20–30 games on your best time control to build consistency. Review 5 losses from your weakest time control to identify improvement areas.`;

  return NextResponse.json({ 
    insight: heuristic, 
    source: "local" 
  }, { status: 200 });
}