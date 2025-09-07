// app/api/admin/fhcems/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import FHCem from "@/models/FHCem";
import { connect } from "@/lib/mongoose";
import { requireAdmin } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await connect();
  await requireAdmin(_req);
  const item = await FHCem.findById(params.id).lean();
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await connect();
  await requireAdmin(req);
  const body = await req.json();
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await connect();
  await requireAdmin(req);
  const ok = await FHCem.findByIdAndDelete(params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
