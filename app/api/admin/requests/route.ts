// app/api/admin/requests/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { FundingRequest } from "@/models/FundingRequest";

export async function GET() {
  try {
    const me = await getUserFromCookie();
    if (!me || me.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const rows = await FundingRequest.find({})
      .sort({ createdAt: -1 })
      .select(
        "userId decFirstName decLastName insuranceCompany policyNumbers createdAt fhRep assignmentAmount status"
      )
      .lean();

    const requests = rows.map((r: any) => ({
      id: String(r._id),
      decName: [r.decFirstName, r.decLastName].filter(Boolean).join(" "),
      insuranceCompany: r.insuranceCompany || "",
      policyNumbers: r.policyNumbers || "",
      createdAt: r.createdAt,
      fhRep: r.fhRep || "",
      assignmentAmount: r.assignmentAmount || "",
      status: r.status || "Submitted",
      userId: String(r.userId || ""),
    }));

    return NextResponse.json({ requests });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
