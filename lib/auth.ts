// lib/auth.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connect } from "@/lib/mongoose";
import User from "@/models/User";

type JwtPayload = { sub?: string; id?: string; userId?: string; [k: string]: any };
const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) throw new Error("JWT_SECRET is not set in environment.");

const COOKIE_NAMES = [
  process.env.AUTH_COOKIE_NAME || "token",
  "auth",
  "jwt",
];

function getTokenFromReq(req: NextRequest): string | null {
  for (const name of COOKIE_NAMES) {
    const v = req.cookies.get(name)?.value;
    if (v) return v;
  }
  return null;
}

export async function getUserFromRequest(req: NextRequest) {
  await connect();
  const token = getTokenFromReq(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const id = decoded.sub || decoded.id || decoded.userId;
    if (!id) return null;
    const user = await User.findById(id).lean();
    return user || null;
  } catch {
    return null;
  }
}

/**
 * Preferred pattern: guards return either a NextResponse (error) or the user.
 * In routes, do:
 *   const guard = await requireAdmin(req);
 *   if (guard instanceof NextResponse) return guard;
 *   const adminUser = guard; // safe
 */
export async function requireAuth(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return user;
}

export async function requireAdmin(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return user;
}
