// app/api/requests/[id]/status/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { FundingRequest } from "@/models/FundingRequest";
import mongoose from "mongoose";

const ALLOWED = ["Submitted", "Verifying", "Approved", "Funded", "Closed"] as const;

export async function PATCH(req: Request, context: any) {
  try {
    const me = await getUserFromCookie();
    if (!me || me.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await (context?.params ?? {});
    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const nextStatus = String(body?.status || "");
    const note = typeof body?.note === "string" ? body.note : "";

    if (!ALLOWED.includes(nextStatus as any)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await connectDB();

    const doc: any = await FundingRequest.findById(id).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated: any = await FundingRequest.findByIdAndUpdate(
      id,
      {
        status: nextStatus,
        $push: { statusHistory: { status: nextStatus, by: me.sub, note } },
      },
      { new: true, select: "status updatedAt" }
    ).lean();

    return NextResponse.json({ ok: true, status: updated.status, updatedAt: updated.updatedAt });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
