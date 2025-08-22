// app/api/insurance-companies/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { InsuranceCompany } from "@/models/InsuranceCompany";

export async function GET() {
  try {
    await connectDB();

    const rows = await InsuranceCompany.find({})
      .sort({ name: 1 })
      .select("name phone fax notes")
      .lean();

    const items = rows.map((r: any) => ({
      id: String(r._id),
      name: r.name,
      phone: r.phone || "",
      fax: r.fax || "",
      notes: r.notes || "",
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
