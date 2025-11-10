import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const publicRoutes = ["/"];
const authRoutes = ["/auth/sign-in", "/auth/sign-up", "/auth/sign-out"];
const apiAuthPrefix = "/api/auth";

export async function middleware(request: NextRequest) {
  const session = getSessionCookie(request);

  const path = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);
  const isApiAuthRoute = path.startsWith(apiAuthPrefix);
  const isAuthRoute = authRoutes.includes(path);

  if (isApiAuthRoute || isAuthRoute) {
    return NextResponse.next();
  }

  if (!session && !isPublicRoute) {
    const callbackPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    const newUrl = new URL(
      `/auth/sign-in?callbackUrl=${encodeURIComponent(callbackPath)}`,
      request.nextUrl.origin,
    );
    return Response.redirect(newUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
