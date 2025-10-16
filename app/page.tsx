import Stats from "@/components/Stats";
import PlayerSelect from "@/components/PlayerSelect";
import SummaryCard from "@/components/SummaryCard"; // ← add
import { prisma } from "@/lib/prisma";

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const selectedPlayer = typeof sp.player === "string" ? sp.player : undefined;

  const now = new Date();
  const since60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since7  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

  const playersRaw = await prisma.event.findMany({
    where: { service: "chess" },
    select: { player: true },
    distinct: ["player"],
  });
  const players = playersRaw.map(p => p.player).filter(Boolean) as string[];

  const whereBase: any = { service: "chess", createdAt: { gte: since60 } };
  if (selectedPlayer) whereBase.player = selectedPlayer;

  const rows = await prisma.event.findMany({
    where: whereBase,
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, route: true, status: true },
  });

  const last7 = rows.filter(r => r.createdAt >= since7);
  const total7d = last7.length;
  const wins7d  = last7.filter(r => r.status === 1).length;
  const winRate7d = total7d ? wins7d / total7d : 0;
  const lastIngested = rows.length ? rows[rows.length - 1].createdAt.toISOString() : null;

  const last30 = rows.filter(r => r.createdAt >= since30);
  const dayMap = new Map<string, { games: number; wins: number }>();
  for (const r of last30) {
    const key = ymd(r.createdAt);
    const e = dayMap.get(key) || { games: 0, wins: 0 };
    e.games += 1;
    if (r.status === 1) e.wins += 1;
    dayMap.set(key, e);
  }
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = ymd(d);
    if (!dayMap.has(key)) dayMap.set(key, { games: 0, wins: 0 });
  }
  const daily = Array.from(dayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, games: v.games, wins: v.wins, winRate: v.games ? v.wins / v.games : 0 }));

  const tcMap = new Map<string, { games: number; wins: number }>();
  for (const r of rows) {
    const k = (r.route || "/unknown").replace("/", "");
    const e = tcMap.get(k) || { games: 0, wins: 0 };
    e.games += 1;
    if (r.status === 1) e.wins += 1;
    tcMap.set(k, e);
  }
  const byTimeClass = Array.from(tcMap.entries())
    .map(([timeClass, v]) => ({ timeClass, games: v.games, winRate: v.games ? v.wins / v.games : 0 }))
    .sort((a, b) => b.games - a.games);

  const kpis = { total7d, wins7d, winRate7d, lastIngested };

  return (
    <main className="max-w-6xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Telemetry Insights — Chess</h1>
        <PlayerSelect players={players} />
      </div>
      <Stats kpis={kpis} daily={daily} byTimeClass={byTimeClass} />
      <SummaryCard /> {/* ← add */}
    </main>
  );
}
