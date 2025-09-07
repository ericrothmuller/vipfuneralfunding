// app/api/profile/connect-fhcem/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import FHLinkRequest from "@/models/FHLinkRequest";
import User from "@/models/User";

export async function POST(req: Request) {
  const me = await getUserFromCookie();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { name } = await req.json().catch(() => ({ name: "" }));
  const clean = (name || "").trim();
  if (!clean) return NextResponse.json({ error: "FH/CEM Name required" }, { status: 400 });

  const u = await User.findById(me.sub).lean();
  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (u.fhCemId) return NextResponse.json({ error: "Already linked to an FH/CEM" }, { status: 400 });

  const existing = await FHLinkRequest.findOne({ userId: me.sub, status: "Pending" });
  if (existing) return NextResponse.json({ error: "You already have a pending link request" }, { status: 400 });

  const lr = await FHLinkRequest.create({
    userId: me.sub,
    requestedName: clean,
    status: "Pending",
  });

  return NextResponse.json({ ok: true, requestId: lr._id }, { status: 201 });
}
