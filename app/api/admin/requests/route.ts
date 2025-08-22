// app/api/admin/requests/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { FundingRequest } from "@/models/FundingRequest";
import mongoose from "mongoose";

const ALLOWED_STATUSES = ["Submitted", "Verifying", "Approved", "Funded", "Closed"] as const;

function parseDateRange(from?: string | null, to?: string | null) {
  const range: Record<string, Date> = {};
  if (from) {
    const d = new Date(from);
    if (!isNaN(d.getTime())) range.$gte = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
  }
  if (to) {
    const d = new Date(to);
    if (!isNaN(d.getTime())) range.$lte = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999));
  }
  return Object.keys(range).length ? range : null;
}

export async function GET(req: Request) {
  try {
    const me = await getUserFromCookie();
    if (!me || me.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const fh     = url.searchParams.get("fh");
    const from   = url.searchParams.get("from");
    const to     = url.searchParams.get("to");
    const q      = (url.searchParams.get("q") || "").trim();

    const find: any = {};
    if (status && ALLOWED_STATUSES.includes(status as any)) find.status = status;
    if (fh && mongoose.isValidObjectId(fh)) find.userId = new mongoose.Types.ObjectId(fh);
    const createdRange = parseDateRange(from, to);
    if (createdRange) find.createdAt = createdRange;
    if (q) {
      const rx = { $regex: q, $options: "i" };
      find.$or = [
        { decFirstName: rx },
        { decLastName: rx },
        { policyNumbers: rx },
        { insuranceCompany: rx },
        { "otherInsuranceCompany.name": rx },
      ];
    }

    const rows = await FundingRequest.find(find)
      .sort({ createdAt: -1 })
      .select(
        "userId decFirstName decLastName insuranceCompanyId otherInsuranceCompany insuranceCompany policyNumbers createdAt fhRep assignmentAmount status"
      )
      .populate({ path: "insuranceCompanyId", select: "name" })
      .populate({ path: "userId", select: "email role" })
      .lean();

    const requests = rows.map((r: any) => {
      const companyDisplay =
        (r.insuranceCompanyId && r.insuranceCompanyId.name) ||
        (r.otherInsuranceCompany?.name) ||
        r.insuranceCompany || "";
      return {
        id: String(r._id),
        decName: [r.decFirstName, r.decLastName].filter(Boolean).join(" "),
        insuranceCompany: companyDisplay,
        policyNumbers: r.policyNumbers || "",
        createdAt: r.createdAt,
        fhRep: r.fhRep || "",
        assignmentAmount: r.assignmentAmount || "",
        status: r.status || "Submitted",
        userId: String(r.userId?._id || ""),
        ownerEmail: r.userId?.email || "",
      };
    });

    return NextResponse.json({ requests });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
