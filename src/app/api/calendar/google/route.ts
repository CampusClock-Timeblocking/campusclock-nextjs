import { env } from "@/env";
import { google } from "@/server/lib/arctic";
import { auth } from "@/server/lib/auth";
import { generateState, generateCodeVerifier } from "arctic";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    const scopes = [
      "openid",
      "profile",
      "email",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
      "https://www.googleapis.com/auth/calendar.calendars.readonly",
    ];

    const url = google.createAuthorizationURL(state, codeVerifier, scopes);

    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");

    const cookieStore = await cookies();

    const isSecure = request.url.startsWith("https://");

    cookieStore.set("google_oauth_state", state, {
      path: "/",
      secure: isSecure,
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: "lax",
    });

    cookieStore.set("google_oauth_code_verifier", codeVerifier, {
      path: "/",
      secure: isSecure,
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: "lax",
    });

    cookieStore.set("google_oauth_user_id", session.user.id, {
      path: "/",
      secure: isSecure,
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: "lax",
    });

    return NextResponse.redirect(url.toString());
  } catch (error) {
    console.error("OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 },
    );
  }
}
