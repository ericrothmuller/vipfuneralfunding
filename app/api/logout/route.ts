// app/api/logout/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { serialize } from "cookie";

function makeRedirectResponse() {
  const cleared = serialize("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // Always redirect to your live domain home page or if in production, localhost.
  const redirectUrl = `${process.env.BASE_URL || "http://localhost:3000"}`;

  const res = NextResponse.redirect(redirectUrl);
  res.headers.set("Set-Cookie", cleared);
  return res;
}

export async function POST() {
  return makeRedirectResponse();
}

export async function GET() {
  return makeRedirectResponse();
}
