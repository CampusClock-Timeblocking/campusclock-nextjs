// app/api/auth/google-calendar/callback/route.ts
import { CalendarAccountService } from "@/server/api/services/calendar-account-service";
import { GCalService } from "@/server/api/services/g-cal-service";
import { db } from "@/server/db";
import { google } from "@/server/lib/arctic";
import { OAuth2RequestError, ArcticFetchError, decodeIdToken } from "arctic";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

interface GoogleIdTokenClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
  hd?: string;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("google_oauth_state")?.value;
  const storedCodeVerifier = cookieStore.get(
    "google_oauth_code_verifier",
  )?.value;
  const storedUserId = cookieStore.get("google_oauth_user_id")?.value;

  const baseUrl = process.env.NEXTAUTH_URL ?? url.origin;

  // Validation: Check all required parameters
  if (!code || !state || !storedState || !storedCodeVerifier || !storedUserId) {
    return NextResponse.redirect(
      `${baseUrl}/account/settings/calendars?error=invalid_state`,
    );
  }

  // Validation: Check state matches (CSRF protection)
  if (state !== storedState) {
    console.error("State mismatch - possible CSRF attack");
    return NextResponse.redirect(
      `${baseUrl}/account/settings/calendars?error=invalid_state`,
    );
  }

  try {
    const tokens = await google.validateAuthorizationCode(
      code,
      storedCodeVerifier,
    );

    const accessToken = tokens.accessToken();
    const accessTokenExpiresAt = tokens.accessTokenExpiresAt();
    const idToken = tokens.idToken();
    const claims = decodeIdToken(idToken) as GoogleIdTokenClaims;

    // Validate required claims
    if (!claims.email) {
      console.error("No email in ID token claims");
      return NextResponse.redirect(
        `${baseUrl}/account/settings/calendars?error=no_email`,
      );
    }

    if (!claims.email_verified) {
      console.warn("Email not verified:", claims.email);
    }

    // Get refresh token (with warning if missing)
    let refreshToken: string | null = null;
    if (tokens.hasRefreshToken()) {
      refreshToken = tokens.refreshToken();
    } else {
      console.warn(
        "⚠️ No refresh token received for user:",
        claims.email,
        "\nThis can happen if:",
        "\n- User previously authorized this app",
        "\n- Used prompt=select_account instead of prompt=consent",
        "\nUser should revoke access at: https://myaccount.google.com/permissions",
      );
    }

    // Link calendar account
    const calendarAccountService = new CalendarAccountService(db);
    const accountData = {
      userId: storedUserId,
      provider: "google" as const,
      providerAccountId: claims.sub,
      email: claims.email,
      name: claims.name,
      accessToken: accessToken,
      refreshToken: refreshToken ?? undefined,
      expiresAt: accessTokenExpiresAt,
      scope: tokens.scopes().join(","),
    };

    const account = await calendarAccountService.linkCalendarAccount(
      accountData,
      storedUserId,
    );

    const gCalService = new GCalService(db);
    await gCalService.syncGoogleCalendarAccount(storedUserId, account.id);

    return NextResponse.redirect(
      `${baseUrl}/account/settings/calendars?success=true`,
    );
  } catch (e) {
    console.error("OAuth callback error:", e);

    if (e instanceof OAuth2RequestError) {
      console.error("OAuth2RequestError:", {
        code: e.code,
        message: e.message,
        description: e.description,
      });
      return NextResponse.redirect(
        `${baseUrl}/account/settings/calendars?error=oauth_request_failed`,
      );
    }

    if (e instanceof ArcticFetchError) {
      console.error("ArcticFetchError:", e.cause);
      return NextResponse.redirect(
        `${baseUrl}/account/settings/calendars?error=network_error`,
      );
    }

    // Handle sync errors separately from auth errors
    if (e instanceof Error && e.message.includes("sync")) {
      console.error("Sync error:", e.message);
      return NextResponse.redirect(
        `${baseUrl}/account/settings/calendars?error=sync_failed`,
      );
    }

    // Generic error
    return NextResponse.redirect(
      `${baseUrl}/account/settings/calendars?error=oauth_failed`,
    );
  } finally {
    // Always clean up cookies (security best practice)
    cookieStore.delete("google_oauth_state");
    cookieStore.delete("google_oauth_code_verifier");
    cookieStore.delete("google_oauth_user_id");
  }
}
