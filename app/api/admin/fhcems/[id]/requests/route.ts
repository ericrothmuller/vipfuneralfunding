// app/api/admin/fhcems/[id]/requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/lib/mongoose";
import { requireAdmin } from "@/lib/auth";
import User from "@/models/User";
import FundingRequest from "@/models/FundingRequest"; // your existing model

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await connect();
  await requireAdmin(req);

  // Find all users linked to this FH/CEM
  const users = await User.find({ fhCemId: params.id }).select("_id").lean();
  const ownerIds = users.map((u) => u._id);
  if (!ownerIds.length) return NextResponse.json({ items: [] });

  // Fetch funding requests owned by these users
  const items = await FundingRequest
    .find({ ownerId: { $in: ownerIds } }) // adapt if your field is named differently
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ items });
}
