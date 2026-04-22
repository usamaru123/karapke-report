// Next 16 renamed the root request-interceptor convention from `middleware` to
// `proxy`. `proxy.ts` runs on the Node.js runtime (edge is not supported here),
// which lets us use @supabase/ssr without tripping on edge-only limits such as
// `__dirname is not defined`. See:
//   node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md
// The matcher config is identical to the prior middleware.ts.

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login");
  const isApiRoute = pathname.startsWith("/api");

  if (!user && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
