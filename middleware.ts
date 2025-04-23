import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Allow Socket.io connections
  if (request.nextUrl.pathname.startsWith("/api/socketio")) {
    return NextResponse.next()
  }

  // Check for authentication on protected routes
  if (
    (request.nextUrl.pathname.startsWith("/chat") ||
      request.nextUrl.pathname.startsWith("/events") ||
      request.nextUrl.pathname.startsWith("/event")) &&
    !request.cookies.has("user_session")
  ) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/chat/:path*", "/events/:path*", "/event/:path*", "/api/socketio"],
}
