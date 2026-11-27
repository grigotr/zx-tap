import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import {
  getGoogleOAuthConfig,
  YOUTUBE_STATE_COOKIE,
} from "../shared";
import { YOUTUBE_CHANNEL_ID } from "../../../youtube";

export const runtime = "edge";

interface GoogleTokenResponse {
  access_token?: string;
}

interface SubscriptionListResponse {
  items?: Array<{
    snippet?: {
      resourceId?: {
        channelId?: string;
      };
    };
  }>;
}

function getStateCookie(request: Request) {
  const cookie = request.headers.get("cookie");
  return cookie?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${YOUTUBE_STATE_COOKIE}=`))
    ?.slice(YOUTUBE_STATE_COOKIE.length + 1);
}

function redirectWithStateCleared(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(YOUTUBE_STATE_COOKIE, "", {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/youtube",
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const storedState = getStateCookie(request);
  const telegramId = state?.split(".").at(-1);
  const config = getGoogleOAuthConfig();

  if (
    !config ||
    !process.env.DATABASE_URL ||
    !state ||
    state !== storedState ||
    !telegramId ||
    !/^\d{1,20}$/.test(telegramId) ||
    !Number.isSafeInteger(Number(telegramId)) ||
    url.origin !== new URL(config.redirectUri).origin ||
    url.pathname !== new URL(config.redirectUri).pathname
  ) {
    return redirectWithStateCleared(request);
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

    const saveStatus = async (status: "verified" | "not_subscribed" | "error") => {
      await sql`
        INSERT INTO youtube_channel_verifications (telegram_id, channel_id, status, verified_at)
        VALUES (${telegramId}, ${YOUTUBE_CHANNEL_ID}, ${status}, NOW())
        ON CONFLICT (telegram_id) DO UPDATE SET
          channel_id = EXCLUDED.channel_id,
          status = EXCLUDED.status,
          verified_at = NOW();
      `;
    };

    if (url.searchParams.has("error")) {
      await saveStatus("error");
      return redirectWithStateCleared(request);
    }

    const code = url.searchParams.get("code");
    if (!code) {
      await saveStatus("error");
      return redirectWithStateCleared(request);
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenResponse.json() as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Google OAuth token exchange failed:", tokenResponse.status);
      await saveStatus("error");
      return redirectWithStateCleared(request);
    }

    const subscriptionsUrl = new URL("https://www.googleapis.com/youtube/v3/subscriptions");
    subscriptionsUrl.searchParams.set("part", "snippet");
    subscriptionsUrl.searchParams.set("mine", "true");
    subscriptionsUrl.searchParams.set("forChannelId", YOUTUBE_CHANNEL_ID);
    subscriptionsUrl.searchParams.set("maxResults", "1");
    const subscriptionsResponse = await fetch(subscriptionsUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const subscriptionsData = await subscriptionsResponse.json() as SubscriptionListResponse;
    if (!subscriptionsResponse.ok) {
      console.error("YouTube subscription verification failed:", subscriptionsResponse.status);
      await saveStatus("error");
      return redirectWithStateCleared(request);
    }

    const isSubscribed = subscriptionsData.items?.some(
      (item) => item.snippet?.resourceId?.channelId === YOUTUBE_CHANNEL_ID,
    );
    await saveStatus(isSubscribed ? "verified" : "not_subscribed");
    return redirectWithStateCleared(request);
  } catch (error) {
    console.error("YouTube verification callback error:", error);
    return redirectWithStateCleared(request);
  }
}
