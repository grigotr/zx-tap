import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = Number(searchParams.get("telegramId") || 0);
    const sql = neon(process.env.DATABASE_URL!);

    const top = await sql`
      SELECT telegram_id, username, coins
      FROM users
      ORDER BY coins DESC
      LIMIT 20;
    `;

    let myRank = null;
    if (telegramId) {
      const rankRes = await sql`
        SELECT COUNT(*) + 1 AS rank
        FROM users
        WHERE coins > COALESCE((SELECT coins FROM users WHERE telegram_id = ${telegramId}), 0);
      `;
      myRank = Number(rankRes[0]?.rank || 1);
    }

    return NextResponse.json({ top, myRank });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ top: [], myRank: null }, { status: 500 });
  }
}
