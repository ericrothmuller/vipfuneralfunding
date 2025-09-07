// app/api/admin/fhcems/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import FHCem from "@/models/FHCem";

async function requireAdminFromCookie() {
  const me = await getUserFromCookie();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return me;
}

export async function GET(req: Request) {
  const guard = await requireAdminFromCookie();
  if (guard instanceof NextResponse) return guard;

  await connectDB();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const filter = q ? { name: { $regex: q, $options: "i" } } : {};
  const items = await FHCem.find(filter).sort({ name: 1 }).lean();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireAdminFromCookie();
  if (guard instanceof NextResponse) return guard;

  await connectDB();
  const body = await req.json().catch(() => ({}));
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
