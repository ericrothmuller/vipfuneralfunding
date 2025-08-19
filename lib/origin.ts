// lib/origin.ts
import { headers } from "next/headers";

export function getBaseUrl() {
  // Prefer explicit env in prod
  const env = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/+$/, "");

  // Fallback: derive from request headers (works on Vercel/Node)
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`.replace(/\/+$/, "");
}
