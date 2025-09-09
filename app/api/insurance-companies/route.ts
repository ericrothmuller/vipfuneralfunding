// app/api/insurance-companies/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { InsuranceCompany } from "@/models/InsuranceCompany";

export async function GET(req: Request) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    const filter: any = {};
    if (q) {
      filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    const rows = await InsuranceCompany.find(filter)
      .sort({ name: 1 })
      .select("name email phone fax notes sendAssignmentBy verificationTime")
      .lean();

    const items = rows.map((r: any) => ({
      id: String(r._id),
      name: r.name,
      email: r.email || "",
      phone: r.phone || "",
      fax: r.fax || "",
      sendAssignmentBy: r.sendAssignmentBy || "Fax",
      verificationTime: r.verificationTime || "",
      notes: r.notes || "",
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
