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
  
  const best = top ? `${top.k} (${(top.wr * 100).toFixed(2)}% WR, ${top.g} games)` : "n/a";
  const worst = low ? `${low.k} (${(low.wr * 100).toFixed(2)}% WR)` : "n/a";

  // Heuristic fallback
  const heuristic =
    `📊 Last 7 Days Performance:\n\n` +
    `• Played ${total} games: ${wins} wins, ${draws} draws, ${losses} losses (${(winRate * 100).toFixed(2)}% win rate)\n` +
    `• Highest volume: ${best}\n` +
    `• Weakest performance: ${worst}\n\n` +
    `💡 Recommendation:\n` +
    `Focus 20–30 games on your best time control to build consistency. Review 5 losses from your weakest time control to identify improvement areas.`;

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
      `You are a concise chess performance coach. Analyze this 7-day summary:\n\n` +
      `Total Games: ${total}\n` +
      `Record: ${wins}W-${draws}D-${losses}L (${(winRate * 100).toFixed(1)}% win rate)\n` +
      `By Time Control: ${timeControlBreakdown}\n\n` +
      `Provide exactly 3 bullet points (max 120 words total):\n` +
      `1. Most notable pattern or trend\n` +
      `2. Likely cause or weakness\n` +
      `3. Specific actionable recommendation`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a concise chess coach. Keep responses under 120 words with 3 bullets." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 250,
    });

    const insight = completion.choices[0]?.message?.content?.trim() || heuristic;
    return NextResponse.json({ insight, source: "openai" }, { status: 200 });
    
  } catch (error) {
    console.error("OpenAI API error:", error);
    // Fallback to heuristic on any error
    return NextResponse.json({ insight: heuristic, source: "heuristic" }, { status: 200 });
  }
}