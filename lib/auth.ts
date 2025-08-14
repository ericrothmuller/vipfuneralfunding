import "server-only";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

type JWTPayload = { sub: string; email: string };

export function getUserFromCookie() {
  const store = cookies() as unknown as {
    get(name: string): { value: string } | string | undefined;
  };

  const raw = store.get("token");
  const token = typeof raw === "string" ? raw : raw?.value;

  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
  } catch {
    return null;
  }
}