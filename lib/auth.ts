// lib/auth.ts
import "server-only";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

type JWTPayload = { sub: string; email: string };

export async function getUserFromCookie(): Promise<JWTPayload | null> {
  // ⬇️ Next 15+ requires awaiting cookies()
  const store = await cookies();
  const token = store.get("token")?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
  } catch {
    return null;
  }
}