// app/api/profile/connect-fhcem/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/lib/mongoose";
import { requireAuth } from "@/lib/auth";
import FHLinkRequest from "@/models/FHLinkRequest";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  await connect();
  const user = await requireAuth(req); // must return the authed user doc or at least userId

  const { name } = await req.json();
  const clean = (name || "").trim();
  if (!clean) return NextResponse.json({ error: "FH/CEM Name required" }, { status: 400 });

  // Ensure user is not already linked
  const u = await User.findById(user._id).lean();
  if (u?.fhCemId) return NextResponse.json({ error: "Already linked to an FH/CEM" }, { status: 400 });

  // Avoid duplicate pending requests
  const existing = await FHLinkRequest.findOne({ userId: user._id, status: "Pending" });
  if (existing) return NextResponse.json({ error: "You already have a pending link request" }, { status: 400 });

  const lr = await FHLinkRequest.create({
    userId: user._id,
    requestedName: clean,
    status: "Pending",
  });

  // (Optional) You can notify admins here via email/queue if you have notifications set up.

  return NextResponse.json({ ok: true, requestId: lr._id }, { status: 201 });
}
