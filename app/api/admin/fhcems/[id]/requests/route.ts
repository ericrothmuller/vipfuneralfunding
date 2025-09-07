// app/api/admin/fhcems/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/lib/mongoose";
import { requireAdmin } from "@/lib/auth";
import FHCem from "@/models/FHCem";

export async function GET(req: NextRequest) {
  await connect();
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard; // 401/403 handled

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const filter = q ? { name: { $regex: q, $options: "i" } } : {};
  const items = await FHCem.find(filter).sort({ name: 1 }).lean();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  await connect();
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json();
  const doc = await FHCem.create({
    name: (body.name || "").trim(),
    reps: body.reps || [],
    phone: body.phone || "",
    email: body.email || "",
    fax: body.fax || "",
    mailingAddress: body.mailingAddress || "",
    notes: body.notes || "",
  });
  return NextResponse.json({ item: doc }, { status: 201 });
}
