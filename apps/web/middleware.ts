import { NextResponse, type NextRequest } from "next/server";

const OWNER_COOKIE = "brh-assistant-owner";
const OWNER = /^[A-Za-z0-9_-]{16,128}$/;

/**
 * Issue the anonymous conversation-owner cookie before any assistant request.
 * Both the sidebar list and the deep-link restore read it, so it must exist
 * before the first request rather than being created by whichever route wins.
 */
export function middleware(request: NextRequest) {
  const existing = request.cookies.get(OWNER_COOKIE)?.value;
  if (existing && OWNER.test(existing)) return NextResponse.next();

  const owner = crypto.randomUUID();
  const headers = new Headers(request.headers);
  const cookie = request.headers.get("cookie");
  headers.set("cookie", `${cookie ? `${cookie}; ` : ""}${OWNER_COOKIE}=${owner}`);
  const response = NextResponse.next({ request: { headers } });
  response.cookies.set({
    name: OWNER_COOKIE,
    value: owner,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  matcher: ["/assistant/:path*", "/api/assistant/:path*"],
};
