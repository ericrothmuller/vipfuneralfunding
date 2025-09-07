// app/api/admin/fhcems/route.ts
import { NextRequest, NextResponse } from "next/server";
import FHCem from "@/models/FHCem";
import User from "@/models/User";
import { connect } from "@/lib/mongoose"; // <- use your existing connect helper
import { requireAdmin } from "@/lib/auth"; // <- implement/plug your admin guard

export async function GET(req: NextRequest) {
  await connect();
  await requireAdmin(req);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const filter = q ? { name: { $regex: q, $options: "i" } } : {};
  const items = await FHCem.find(filter).sort({ name: 1 }).lean();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  await connect();
  await requireAdmin(req);
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
