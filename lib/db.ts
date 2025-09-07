// lib/db.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("Please set MONGODB_URI in .env.local");

// Use the same global cache key you already had
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCached:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

let cached = global._mongooseCached || { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { dbName: "appdb" })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  global._mongooseCached = cached;
  return cached.conn;
}
