// lib/auth.ts
import "server-only";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export type JWTPayload = { sub: string; email: string; role: "ADMIN" | "FH_CEM" | "NEW"; active: boolean };

export async function getUserFromCookie() {
  // In Next 15/React 19, cookies() is async
  const store = await cookies();
  const raw = store.get("token")?.value;
  if (!raw) return null;
  try {
    return jwt.verify(raw, process.env.JWT_SECRET!) as JWTPayload;
  } catch {
    return null;
  }
}
