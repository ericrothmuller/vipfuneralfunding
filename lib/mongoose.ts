// lib/mongoose.ts
import { connectDB } from "@/lib/db";

/**
 * Unify all DB access through connectDB() so we only keep a single
 * cached connection and preserve dbName: "appdb".
 */
export async function connect() {
  return connectDB();
}
