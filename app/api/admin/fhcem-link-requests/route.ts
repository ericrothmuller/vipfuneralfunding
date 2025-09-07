// app/api/admin/fhcem-link-requests/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import FHLinkRequest from "@/models/FHLinkRequest";
import FHCem from "@/models/FHCem";
import User from "@/models/User";

async function requireAdminFromCookie() {
  const me = await getUserFromCookie();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return me;
}

export async function GET(_req: Request) {
  const guard = await requireAdminFromCookie();
  if (guard instanceof NextResponse) return guard;

  await connectDB();
  const items = await FHLinkRequest.find({ status: "Pending" })
    .populate("userId", "email contactName contactPhone contactEmail fhCemId")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireAdminFromCookie();
  if (guard instanceof NextResponse) return guard;

  await connectDB();
  const { linkRequestId, action, fhCemId } = await req.json().catch(() => ({}));

  const lr = await FHLinkRequest.findById(linkRequestId);
  if (!lr) return NextResponse.json({ error: "Link request not found" }, { status: 404 });

  if (action === "reject") {
    lr.status = "Rejected";
    await lr.save();
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    if (!fhCemId) return NextResponse.json({ error: "fhCemId required to approve" }, { status: 400 });
    const fh = await FHCem.findById(fhCemId);
    if (!fh) return NextResponse.json({ error: "FH/CEM not found" }, { status: 404 });

    await User.findByIdAndUpdate(lr.userId, { $set: { fhCemId: fh._id, fhName: fh.name } });
    lr.status = "Approved";
    await lr.save();

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
