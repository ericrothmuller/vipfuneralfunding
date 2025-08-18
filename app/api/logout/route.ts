// app/api/logout/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { serialize } from "cookie";

export async function POST() {
  const cookie = serialize("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // Clear cookie and redirect to login
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"), {
    headers: {
      "Set-Cookie": cookie,
    },
  });
}
