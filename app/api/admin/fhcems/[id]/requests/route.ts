// app/api/admin/fhcems/[id]/requests/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import User from "@/models/User";
import FundingRequest from "@/models/FundingRequest";
import mongoose from "mongoose";

async function requireAdminFromCookie() {
  const me = await getUserFromCookie();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return me;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdminFromCookie();
  if (guard instanceof NextResponse) return guard;

  await connectDB();
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const users = await User.find({ fhCemId: params.id }).select("_id").lean();
  const ownerIds = users.map((u: any) => u._id);
  if (!ownerIds.length) return NextResponse.json({ items: [] });

  const items = await FundingRequest.find({ ownerId: { $in: ownerIds } })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ items });
}
