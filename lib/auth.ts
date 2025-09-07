// lib/auth.ts
import "server-only";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// --- Your original shape (unchanged) ---
export type JWTPayload = {
  sub: string;
  email: string;
  role: "ADMIN" | "FH_CEM" | "NEW";
  active: boolean;
};

/**
 * Exactly as before:
 * - Reads "token" cookie
 * - Uses async cookies() (Next 15 / React 19)
 * - Verifies with JWT_SECRET
 * - Returns JWTPayload or null
 */
export async function getUserFromCookie(): Promise<JWTPayload | null> {
  const store = await cookies();
  const raw = store.get("token")?.value;
  if (!raw) return null;
  try {
    return jwt.verify(raw, process.env.JWT_SECRET!) as JWTPayload;
  } catch {
    return null;
  }
}

// ------- Optional helpers for API route guards (non-breaking) -------

import { connect } from "@/lib/mongoose";
import User, { type IUser } from "@/models/User";

/** Read and verify the same "token" cookie from a NextRequest, then fetch the DB user. */
export async function getUserFromRequest(req: NextRequest): Promise<IUser | null> {
  const raw = req.cookies.get("token")?.value;
  if (!raw) return null;
  try {
    const decoded = jwt.verify(raw, process.env.JWT_SECRET!) as JWTPayload;
    if (!decoded?.sub) return null;
    await connect();
    const user = await User.findById(decoded.sub).lean();
    return (user as unknown as IUser) || null;
  } catch {
    return null;
  }
}

/** Require any authenticated user. Returns IUser or a 401 NextResponse. */
export async function requireAuth(req: NextRequest): Promise<IUser | NextResponse> {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return user;
}

/** Require an admin user. Returns IUser or a 401/403 NextResponse. */
export async function requireAdmin(req: NextRequest): Promise<IUser | NextResponse> {
  const userOr = await requireAuth(req);
  if (userOr instanceof NextResponse) return userOr;
  if (userOr.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return userOr;
}
