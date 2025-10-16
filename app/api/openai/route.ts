import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const player = url.searchParams.get("player") || undefined;

  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const where: any = { service: "chess", createdAt: { gte: since } };
  if (player) where.player = player;

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

    const prompt =
      `You are a concise coach. Analyze last 7 days of chess.\n` +
      `Total=${total}, Wins=${wins}, WinRate=${(winRate * 100).toFixed(0)}%.\n` +
      `ByTimeControl=${arr.map(t => `${t.k}:${Math.round(t.wr*100)}%`).join(", ")}.\n` +
      `Give 3 bullets: notable pattern, likely cause, specific action (<=110 words).`;

    const resp = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
      temperature: 0.3,
    });

    const insight = resp.output_text?.trim() || heuristic;
    return NextResponse.json({ insight, source: "openai" }, { status: 200 });
  } catch {
    // quota or any error → fallback
    return NextResponse.json({ insight: heuristic, source: "heuristic" }, { status: 200 });
  }
}
