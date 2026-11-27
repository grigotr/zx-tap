import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { getGoogleOAuthConfig } from "../shared";
import { YOUTUBE_CHANNEL_ID } from "../../../youtube";

export const runtime = "edge";

const noCacheHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const telegramId = Number(new URL(request.url).searchParams.get("telegramId"));
  if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
    return NextResponse.json(
      { verified: false, configured: Boolean(getGoogleOAuthConfig() && process.env.DATABASE_URL) },
      { headers: noCacheHeaders },
    );
  }
  if (!getGoogleOAuthConfig() || !process.env.DATABASE_URL) {
    return NextResponse.json({ verified: false, configured: false }, { headers: noCacheHeaders });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      CREATE TABLE IF NOT EXISTS youtube_channel_verifications (
        telegram_id BIGINT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        status TEXT NOT NULL,
        verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    const result = await sql`
      SELECT channel_id, status
      FROM youtube_channel_verifications
      WHERE telegram_id = ${telegramId}
      LIMIT 1;
    `;
    return NextResponse.json({
      verified: result[0]?.channel_id === YOUTUBE_CHANNEL_ID && result[0]?.status === "verified",
      status: result[0]?.channel_id === YOUTUBE_CHANNEL_ID ? result[0]?.status : "idle",
      configured: true,
    }, { headers: noCacheHeaders });
  } catch (error) {
    console.error("YouTube verification status error:", error);
    return NextResponse.json(
      { verified: false, configured: true },
      { status: 500, headers: noCacheHeaders },
    );
  }
}
