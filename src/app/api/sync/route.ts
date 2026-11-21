import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { telegramId, username, coinsToAdd, energy, multitap } = await req.json();

    if (!telegramId) {
      return NextResponse.json({ error: "Lipsă Telegram ID" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO users (telegram_id, username, coins, energy, multitap, last_sync)
      VALUES (${telegramId}, ${username || "Player"}, ${coinsToAdd || 0}, ${energy ?? 1000}, ${multitap || 1}, NOW())
      ON CONFLICT (telegram_id) DO UPDATE SET
        coins = users.coins + ${coinsToAdd || 0},
        energy = ${energy ?? 1000},
        multitap = GREATEST(users.multitap, ${multitap || 1}),
        last_sync = NOW()
      RETURNING *;
    `;

    return NextResponse.json({ user: result[0] });
  } catch (error) {
    console.error("Eroare sincronizare Neon:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
