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
    const fh     = url.searchParams.get("fh");    // legacy param for filtering by owner
    const from   = url.searchParams.get("from");
    const to     = url.searchParams.get("to");
    const q      = (url.searchParams.get("q") || "").trim();

    // Build a filter that supports BOTH old and new field names
    const and: any[] = [];

    if (status && ALLOWED_STATUSES.includes(status as any)) {
      and.push({ status });
    }

    const createdRange = parseDateRange(from, to);
    if (createdRange) {
      and.push({ createdAt: createdRange });
    }

    if (fh && mongoose.isValidObjectId(fh)) {
      const owner = new mongoose.Types.ObjectId(fh);
      and.push({ $or: [ { userId: owner }, { ownerId: owner } ] });
    }

    if (q) {
      const rx = { $regex: q, $options: "i" };
      and.push({
        $or: [
          { decFirstName: rx },        // legacy
          { decLastName: rx },         // legacy
          { decedentFirstName: rx },   // new
          { decedentLastName: rx },    // new
          { policyNumbers: rx },
          { insuranceCompany: rx },               // legacy display string
          { "otherInsuranceCompany.name": rx },   // new "Other" IC name
        ],
      });
    }

    const find: any = and.length ? { $and: and } : {};

    const rows = await FundingRequest.find(find)
      .sort({ createdAt: -1 })
      .select(
        "userId ownerId decFirstName decLastName decedentFirstName decedentLastName insuranceCompanyId otherInsuranceCompany insuranceCompany policyNumbers createdAt fhRep assignmentAmount status"
      )
      .populate({ path: "insuranceCompanyId", select: "name" })
      .populate({ path: "userId", select: "email role" })   // legacy
      .populate({ path: "ownerId", select: "email role" })  // new
      .lean();

    const requests = rows.map((r: any) => {
      const companyDisplay =
        (r.insuranceCompanyId && r.insuranceCompanyId.name) ||
        (r.otherInsuranceCompany?.name) ||
        r.insuranceCompany || "";

      const first = r.decFirstName || r.decedentFirstName || "";
      const last  = r.decLastName || r.decedentLastName || "";

      const ownerDoc = r.userId || r.ownerId || null;

      return {
        id: String(r._id),
        decName: [first, last].filter(Boolean).join(" "),
        insuranceCompany: companyDisplay,
        policyNumbers: Array.isArray(r.policyNumbers) ? r.policyNumbers.join(", ") : (r.policyNumbers || ""),
        createdAt: r.createdAt,
        fhRep: r.fhRep || "",
        assignmentAmount: r.assignmentAmount || "",
        status: r.status || "Submitted",
        userId: ownerDoc?._id ? String(ownerDoc._id) : "",
        ownerEmail: ownerDoc?.email || "",
      };
    });

    return NextResponse.json({ requests });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
