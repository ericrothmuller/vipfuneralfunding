// app/api/profile/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getUserFromCookie } from "@/lib/auth";

export async function GET() {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findById(me.sub).select("email fhName businessPhone businessFax mailingAddress").lean();
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ user });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { fhName = "", businessPhone = "", businessFax = "", mailingAddress = "" } = body || {};

    await connectDB();
    const updated = await User.findByIdAndUpdate(
      me.sub,
      { fhName, businessPhone, businessFax, mailingAddress },
      { new: true, runValidators: false, upsert: false, select: "email fhName businessPhone businessFax mailingAddress" }
    ).lean();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
