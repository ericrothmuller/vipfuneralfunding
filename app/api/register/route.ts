export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (
      !email ||
      !password ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email }).lean().exec();
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = await User.create({ email, passwordHash });

    // Auto-login: sign a JWT and set cookie
    const token = jwt.sign(
      { sub: String(newUser._id), email: newUser.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const cookie = serialize("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { "Set-Cookie": cookie, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    // Handle duplicate key race (unique index)
    if (err?.code === 11000) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}