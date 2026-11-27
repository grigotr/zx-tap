import { NextResponse } from "next/server";
import { getGoogleOAuthConfig, YOUTUBE_STATE_COOKIE } from "../shared";

export const runtime = "edge";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const telegramId = Number(url.searchParams.get("telegramId"));
  const config = getGoogleOAuthConfig();

  if (!config || !process.env.DATABASE_URL || !Number.isSafeInteger(telegramId) || telegramId <= 0) {
    const redirect = new URL("/", request.url);
    return NextResponse.redirect(redirect);
  }

  const state = `${crypto.randomUUID()}.${telegramId}`;
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.searchParams.set("client_id", config.clientId);
  authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.readonly");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("access_type", "online");

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(YOUTUBE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: new URL(config.redirectUri).protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/youtube",
  });
  return response;
}
