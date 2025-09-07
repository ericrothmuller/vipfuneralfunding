// lib/mongoose.ts
import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not set in environment.");
}

if (!global.__mongooseConn) {
  global.__mongooseConn = { conn: null, promise: null };
}

export async function connect() {
  if (global.__mongooseConn.conn) return global.__mongooseConn.conn;

  if (!global.__mongooseConn.promise) {
    mongoose.set("strictQuery", false);
    global.__mongooseConn.promise = mongoose.connect(MONGODB_URI, {
      // You can add options here if needed
    });
  }

  global.__mongooseConn.conn = await global.__mongooseConn.promise;
  return global.__mongooseConn.conn;
}
