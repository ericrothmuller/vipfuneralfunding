// app/api/profile/connect-fhcem/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/lib/mongoose";
import { requireAuth } from "@/lib/auth";
import FHLinkRequest from "@/models/FHLinkRequest";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  await connect();

  // Guard: require logged-in user
  const guard = await requireAuth(req);
  if (guard instanceof NextResponse) return guard; // 401/403 handled in guard
  const authed = guard as any;

  // Safely derive a userId from whichever field your token/user carries
  const userId =
    authed?._id?.toString?.() ??
    authed?.id ??
    authed?.userId ??
    authed?.sub ??
    null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse + validate input
  const { name } = await req.json().catch(() => ({ name: "" }));
  const clean = (name || "").trim();
  if (!clean) {
    return NextResponse.json({ error: "FH/CEM Name required" }, { status: 400 });
  }

  // Ensure user exists and is not already linked
  const u = await User.findById(userId).lean();
  if (!u) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (u.fhCemId) {
    return NextResponse.json({ error: "Already linked to an FH/CEM" }, { status: 400 });
  }

  // Avoid duplicate pending requests
  const existing = await FHLinkRequest.findOne({ userId, status: "Pending" });
  if (existing) {
    return NextResponse.json({ error: "You already have a pending link request" }, { status: 400 });
  }

  // Create link request
  const lr = await FHLinkRequest.create({
    userId,
    requestedName: clean,
    status: "Pending",
  });

  // Optional: notify admins here

  return NextResponse.json({ ok: true, requestId: lr._id }, { status: 201 });
}
