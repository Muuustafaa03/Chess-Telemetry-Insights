// app/api/summary/route.ts  (or the file you’re editing)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";          // ✅ bring prisma back
import type { Prisma } from "@prisma/client";

// Force runtime execution in Next 15 dev/prod (no static caching)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const player = url.searchParams.get("player") || undefined;

  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ✅ typed filter; player is conditionally included via spread
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
  const winRate = total ? wins / total : 0;

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
  const best = top ? `${top.k} (${Math.round(top.wr * 100)}% WR, ${top.g} games)` : "n/a";
  const worst = low ? `${low.k} (${Math.round(low.wr * 100)}% WR)` : "n/a";

  const heuristic =
    `• Played ${total} games, ${wins} wins (${Math.round(winRate * 100)}% WR).\n` +
    `• Most volume: ${best}. Lowest win rate: ${worst}.\n` +
    `• Action: focus 20–30 games on your best time control; review 5 losses from the weakest.`;

  return NextResponse.json({ insight: heuristic, source: "local" }, { status: 200 });
}
