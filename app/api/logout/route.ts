export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Build a 303 redirect to "/" (or "/login" if you prefer)
  const res = NextResponse.redirect(new URL("/", req.url), { status: 303 });

  // Clear the token cookie
  res.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0), // immediately expired
  });

  return res;
}
