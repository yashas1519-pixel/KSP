import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/unauthorized", "/api", "/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow root path
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Protect /dashboard/* routes
  // Firebase Auth uses client-side tokens (not cookies by default),
  // so we check for the presence of a Firebase auth session cookie.
  // The real auth gating happens via ProtectedRoute component on the client.
  // This middleware serves as a lightweight first-pass for SSR/static pages.
  const authSession = request.cookies.get("__session");
  const firebaseToken = request.cookies.get("firebaseToken");

  if (pathname.startsWith("/dashboard")) {
    // If no session cookie exists, redirect to login
    // Note: This is a best-effort check. Firebase Auth primarily
    // operates client-side, so ProtectedRoute handles the full auth flow.
    if (!authSession && !firebaseToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|locales|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
