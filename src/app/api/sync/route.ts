import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { telegramId, username, coinsToAdd, energy, multitap, referrerId } = await req.json();

    if (!telegramId) {
      return NextResponse.json({ error: "Lipsă Telegram ID" }, { status: 400 });
    }

    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS referrer_id BIGINT;
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS referral_commissions (
        referrer_id BIGINT NOT NULL,
        referred_id BIGINT NOT NULL,
        earned_coins NUMERIC NOT NULL DEFAULT 0,
        PRIMARY KEY (referrer_id, referred_id)
      );
    `;

    const safeReferrerId = Number(referrerId);
    const activeReferrerId = Number.isInteger(safeReferrerId) && safeReferrerId > 0 && safeReferrerId !== Number(telegramId)
      ? safeReferrerId
      : null;

    const result = await sql`
      INSERT INTO users (telegram_id, username, coins, energy, multitap, referrer_id, last_sync)
      VALUES (${telegramId}, ${username || "Player"}, ${coinsToAdd || 0}, ${energy ?? 1000}, ${multitap || 1}, ${activeReferrerId}, NOW())
      ON CONFLICT (telegram_id) DO UPDATE SET
        coins = users.coins + ${coinsToAdd || 0},
        energy = ${energy ?? 1000},
        multitap = GREATEST(users.multitap, ${multitap || 1}),
        referrer_id = COALESCE(users.referrer_id, ${activeReferrerId}),
        last_sync = NOW()
      RETURNING *;
    `;

    const user = result[0];
    const commission = Math.floor((Number(coinsToAdd) || 0) * 0.10);
    if (commission > 0 && user?.referrer_id) {
      await sql`
        UPDATE users
        SET coins = coins + ${commission}, last_sync = NOW()
        WHERE telegram_id = ${user.referrer_id};
      `;
      await sql`
        INSERT INTO referral_commissions (referrer_id, referred_id, earned_coins)
        VALUES (${user.referrer_id}, ${telegramId}, ${commission})
        ON CONFLICT (referrer_id, referred_id) DO UPDATE
        SET earned_coins = referral_commissions.earned_coins + ${commission};
      `;
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Eroare sincronizare Neon:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = Number(searchParams.get("telegramId") || 0);
    if (!telegramId) {
      return NextResponse.json({ referrals: [], referralCount: 0, referralEarnings: 0 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    await sql`
      CREATE TABLE IF NOT EXISTS referral_commissions (
        referrer_id BIGINT NOT NULL,
        referred_id BIGINT NOT NULL,
        earned_coins NUMERIC NOT NULL DEFAULT 0,
        PRIMARY KEY (referrer_id, referred_id)
      );
    `;
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS referrer_id BIGINT;
    `;

    const referrals = await sql`
      SELECT u.telegram_id, u.username,
             COALESCE(c.earned_coins, 0) AS earned
      FROM users u
      LEFT JOIN referral_commissions c
        ON c.referrer_id = ${telegramId}
       AND c.referred_id = u.telegram_id
      WHERE u.referrer_id = ${telegramId}
      ORDER BY u.last_sync DESC;
    `;

    const total = referrals.reduce((sum, row) => sum + Number(row.earned || 0), 0);
    return NextResponse.json({
      referrals,
      referralCount: referrals.length,
      referralEarnings: total,
    });
  } catch (error) {
    console.error("Referral stats error:", error);
    return NextResponse.json({ referrals: [], referralCount: 0, referralEarnings: 0 }, { status: 500 });
  }
}
