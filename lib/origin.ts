// lib/origin.ts
import { headers } from "next/headers";

/**
 * Returns the absolute base URL to use for server-side fetches.
 * - Prefers APP_ORIGIN / NEXT_PUBLIC_BASE_URL if set.
 * - Falls back to deriving from request headers (requires awaiting headers()).
 */
export async function getBaseUrl(): Promise<string> {
  // Prefer explicit env in prod
  const env = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/+$/, "");

  // Dynamic API in Next 15: must be awaited
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  return `${proto}://${host}`.replace(/\/+$/, "");
}
