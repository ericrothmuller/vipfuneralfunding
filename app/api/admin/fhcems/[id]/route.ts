// app/api/admin/fhcems/[id]/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import FHCem from "@/models/FHCem";
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
  const item = await FHCem.findById(params.id).lean();
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdminFromCookie();
  if (guard instanceof NextResponse) return guard;

  await connectDB();
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const item = await FHCem.findByIdAndUpdate(
    params.id,
    {
      $set: {
        name: (body.name || "").trim(),
        reps: body.reps || [],
        phone: body.phone || "",
        email: body.email || "",
        fax: body.fax || "",
        mailingAddress: body.mailingAddress || "",
        notes: body.notes || "",
      },
    },
    { new: true }
  );
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdminFromCookie();
  if (guard instanceof NextResponse) return guard;

  await connectDB();
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const ok = await FHCem.findByIdAndDelete(params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
