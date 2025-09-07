// app/api/admin/fhcem-link-requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/lib/mongoose";
import { requireAdmin } from "@/lib/auth";
import FHLinkRequest from "@/models/FHLinkRequest";
import FHCem from "@/models/FHCem";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  await connect();
  await requireAdmin(req);
  const items = await FHLinkRequest
    .find({ status: "Pending" })
    .populate("userId", "email contactName contactPhone contactEmail fhCemId")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json({ items });
}

// Approve or reject
export async function POST(req: NextRequest) {
  await connect();
  await requireAdmin(req);
  const { linkRequestId, action, fhCemId } = await req.json();

  const lr = await FHLinkRequest.findById(linkRequestId);
  if (!lr) return NextResponse.json({ error: "Link request not found" }, { status: 404 });

  if (action === "reject") {
    lr.status = "Rejected";
    await lr.save();
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    if (!fhCemId) return NextResponse.json({ error: "fhCemId required to approve" }, { status: 400 });

    // Link the user to the selected FH/CEM
    const fh = await FHCem.findById(fhCemId);
    if (!fh) return NextResponse.json({ error: "FH/CEM not found" }, { status: 404 });

    await User.findByIdAndUpdate(lr.userId, { $set: { fhCemId: fh._id, fhName: fh.name } });
    lr.status = "Approved";
    await lr.save();

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
