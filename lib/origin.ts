// lib/origin.ts
import { headers } from "next/headers";

export async function getBaseUrl(): Promise<string> {
  const env = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/+$/, "");
  const h = await headers();                   // Next 15: await
  const proto = h.get("x-forwarded-proto") || "http";
  const host  = h.get("x-forwarded-host")  || h.get("host") || "localhost:3000";
  return `${proto}://${host}`.replace(/\/+$/, "");
}
