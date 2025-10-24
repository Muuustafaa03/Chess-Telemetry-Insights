// app/api/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Utility: retry fetch
async function getJson(url: string, tries = 3): Promise<any> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
      if (res.status === 404) throw new Error(`User not found: ${url}`);
    } catch (err) {
      if (i === tries - 1) throw err;
    }
    await new Promise(r => setTimeout(r, 500 * (i + 1)));
  }
  throw new Error(`Failed to fetch ${url}`);
}

// Map chess.com result -> status int
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = body.username?.toLowerCase().trim();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // 1) Fetch monthly archives
    const archivesUrl = `https://api.chess.com/pub/player/${username}/games/archives`;
    let archivesData;
    
    try {
      archivesData = await getJson(archivesUrl);
    } catch (err) {
      return NextResponse.json(
        { error: `User '${username}' not found on Chess.com` },
        { status: 404 }
      );
    }

    const { archives } = archivesData;
    if (!archives?.length) {
      return NextResponse.json(
        { error: `No games found for user: ${username}` },
        { status: 404 }
      );
    }

    // 2) Last 2 months (adjust if needed)
    const targets: string[] = archives.slice(-2);
    let gamesIngested = 0;

    for (const url of targets) {
      const data = await getJson(url);
      const games = data?.games || [];

      for (const g of games) {
        const isWhite = g.white?.username?.toLowerCase() === username;
        const me = isWhite ? g.white : g.black;
        const status = resultToStatus(me?.result);
        if (status === null) continue;

        const timeClass = g.time_class || "unknown";
        const endTimeSec = g.end_time ? Number(g.end_time) : Math.floor(Date.now() / 1000);

        // Check if game already exists
        const existing = await prisma.event.findFirst({
          where: {
            service: "chess",
            player: username,
            createdAt: new Date(endTimeSec * 1000),
            route: `/${timeClass}`,
          },
        });

        if (!existing) {
          await prisma.event.create({
            data: {
              service: "chess",
              type: "request",
              route: `/${timeClass}`,
              status,
              createdAt: new Date(endTimeSec * 1000),
              player: username,
            },
          });
          gamesIngested++;
        }
      }
    }

    const totalGames = await prisma.event.count({
      where: { service: "chess", player: username },
    });

    return NextResponse.json({
      success: true,
      username,
      gamesIngested,
      totalGames,
      message: `Successfully ingested ${gamesIngested} new games. Total: ${totalGames}`,
    });

  } catch (error) {
    console.error("Ingestion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}