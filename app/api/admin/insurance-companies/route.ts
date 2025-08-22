// app/api/admin/insurance-companies/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { InsuranceCompany } from "@/models/InsuranceCompany";

function isAdmin(me: any) {
  return me && me.role === "ADMIN";
}

// GET /api/admin/insurance-companies?q=search
export async function GET(req: Request) {
  try {
    const me = await getUserFromCookie();
    if (!isAdmin(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    const query: any = {};
    if (q) {
      // simple case-insensitive search on name + notes + docs
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { notes: { $regex: q, $options: "i" } },
        { documentsToFund: { $regex: q, $options: "i" } },
      ];
    }

    const companies = await InsuranceCompany.find(query)
      .sort({ name: 1 })
      .select("name phone fax mailingAddress verificationTime documentsToFund acceptsAdvancements notes createdAt updatedAt")
      .lean();

    const items = companies.map((c: any) => ({
      id: String(c._id),
      name: c.name,
      phone: c.phone || "",
      fax: c.fax || "",
      mailingAddress: c.mailingAddress || "",
      verificationTime: c.verificationTime || "",
      documentsToFund: c.documentsToFund || "",
      acceptsAdvancements: !!c.acceptsAdvancements,
      notes: c.notes || "",
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/admin/insurance-companies
export async function POST(req: Request) {
  try {
    const me = await getUserFromCookie();
    if (!isAdmin(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await connectDB();

    const body = await req.json().catch(() => ({}));
    const name = (body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const created = await InsuranceCompany.create({
      name,
      phone: body?.phone || "",
      fax: body?.fax || "",
      mailingAddress: body?.mailingAddress || "",
      verificationTime: body?.verificationTime || "",
      documentsToFund: body?.documentsToFund || "",
      acceptsAdvancements: !!body?.acceptsAdvancements,
      notes: body?.notes || "",
    });

    return NextResponse.json({ ok: true, id: String(created._id) }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
