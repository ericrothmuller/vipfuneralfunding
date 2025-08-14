import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("Please set MONGODB_URI in .env.local");

let cached = (global as any)._mongooseCached || { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: "appdb",
    }).then((m) => m);
  }
  cached.conn = await cached.promise;
  (global as any)._mongooseCached = cached;
  return cached.conn;
}