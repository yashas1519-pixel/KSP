import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/change-password", "/forgot-password", "/unauthorized", "/api", "/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow root path (it redirects to /login server-side)
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Dashboard routes are protected client-side by ProtectedRoute component.
  // Firebase Auth uses client-side tokens (not cookies), so middleware
  // cannot reliably check auth state. We let requests through and rely
  // on the ProtectedRoute component for real auth gating.
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

