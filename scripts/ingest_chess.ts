// scripts/ingest_chess.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// tiny retrying fetch
async function getJson(url: string, tries = 3): Promise<any> {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    await new Promise(r => setTimeout(r, 500 * (i + 1)));
  }
  throw new Error(`Failed to fetch ${url}`);
}

// map chess.com result -> status int
function resultToStatus(result?: string): number | null {
  if (!result) return null;
  const win = new Set(["win"]);
  const draw = new Set(["agreed", "repetition", "stalemate", "insufficient", "50move", "timevsinsufficient"]);
  const loss = new Set(["checkmated", "timeout", "resigned", "abandoned", "lose"]);
  if (win.has(result)) return 1;
  if (draw.has(result)) return 0;
  if (loss.has(result)) return -1;
  return null;
}

async function main() {
  const usernameArg = (process.argv[2] || "").toLowerCase();
  if (!usernameArg) {
    console.error("Usage: npx ts-node scripts/ingest_chess.ts <chess.com_username>");
    process.exit(1);
  }

  const player = usernameArg; // ← this is the player we’ll store

  // 1) grab monthly archives
  const { archives } = await getJson(`https://api.chess.com/pub/player/${player}/games/archives`);
  if (!archives?.length) {
    console.log("No archives found for user:", player);
    return;
  }

  // 2) last 2 months (adjust if you want more)
  const targets: string[] = archives.slice(-2);

  for (const url of targets) {
    const data = await getJson(url);
    const games = data?.games || [];
    for (const g of games) {
      const isWhite = g.white?.username?.toLowerCase() === player;
      const me = isWhite ? g.white : g.black;
      const status = resultToStatus(me?.result);
      if (status === null) continue;

      const timeClass = g.time_class || "unknown";
      const endTimeSec = g.end_time ? Number(g.end_time) : Math.floor(Date.now() / 1000);

      await prisma.event.create({
        data: {
          service: "chess",
          type: "request",
          route: `/${timeClass}`,
          status,
          createdAt: new Date(endTimeSec * 1000),
          player, 
        },
      });
    }
  }

  const total = await prisma.event.count({ where: { service: "chess", player } });
  console.log(`Ingested games for ${player}. Total chess events (this player): ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
