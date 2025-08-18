// app/api/register/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email }).lean();
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      email,
      passwordHash,
      role: "NEW",
      active: true,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
