// app/api/logout/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { serialize } from "cookie";

/**
 * Clear the auth cookie and redirect to /login.
 * We use the incoming request URL to build an absolute redirect URL
 * so this works on your VPS domain as well as localhost.
 */
function makeRedirectResponse(req: Request) {
  const cleared = serialize("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  const redirectUrl = new URL("/login", req.url); // keeps your current host
  const res = NextResponse.redirect(redirectUrl);
  res.headers.set("Set-Cookie", cleared);
  return res;
}

export async function POST(req: Request) {
  return makeRedirectResponse(req);
}

// Optional: allow GET /api/logout to work too (e.g., if you ever link to it)
export async function GET(req: Request) {
  return makeRedirectResponse(req);
}
