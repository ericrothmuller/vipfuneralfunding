// app/api/admin/requests/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { FundingRequest } from "@/models/FundingRequest";
import { User } from "@/models/User";
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

    const url   = new URL(req.url);
    const q     = (url.searchParams.get("q") || "").trim();
    const fh    = url.searchParams.get("fh");   // legacy owner filter (user id)
    const from  = url.searchParams.get("from");
    const to    = url.searchParams.get("to");
    const stat  = url.searchParams.get("status");

    // Build filter that supports BOTH old and new field names
    const and: any[] = [];

    if (stat && ALLOWED_STATUSES.includes(stat as any)) {
      and.push({ status: stat });
    }

    const createdRange = parseDateRange(from, to);
    if (createdRange) {
      and.push({ createdAt: createdRange });
    }

    if (fh && mongoose.isValidObjectId(fh)) {
      const owner = new mongoose.Types.ObjectId(fh);
      and.push({ $or: [{ userId: owner }, { ownerId: owner }] });
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

    // NOTE: no populate() on userId/ownerId to avoid CastErrors on legacy rows
    const rows = await FundingRequest.find(find)
      .sort({ createdAt: -1 })
      .select(
        "userId ownerId decFirstName decLastName decedentFirstName decedentLastName " +
        "insuranceCompanyId otherInsuranceCompany insuranceCompany policyNumbers " +
        "createdAt fhRep assignmentAmount status"
      )
      .populate({ path: "insuranceCompanyId", select: "name" }) // safe to populate carrier
      .lean();

    // Build an owner email map without populate(). Only query valid ObjectIds.
    const ownerIdStrings: string[] = [];
    for (const r of rows) {
      const raw = (r as any).ownerId ?? (r as any).userId;
      if (!raw) continue;
      const idStr = String(raw);
      if (mongoose.isValidObjectId(idStr)) ownerIdStrings.push(idStr);
    }
    const uniqOwnerIds = Array.from(new Set(ownerIdStrings)).map((s) => new mongoose.Types.ObjectId(s));

    let ownerEmailById: Record<string, string> = {};
    if (uniqOwnerIds.length) {
      const owners = await User.find({ _id: { $in: uniqOwnerIds } })
        .select("email")
        .lean();
      ownerEmailById = owners.reduce<Record<string, string>>((acc, u: any) => {
        acc[String(u._id)] = u.email || "";
        return acc;
      }, {});
    }

    const requests = rows.map((r: any) => {
      const companyDisplay =
        (r.insuranceCompanyId && r.insuranceCompanyId.name) ||
        (r.otherInsuranceCompany?.name) ||
        r.insuranceCompany || "";

      const first = r.decFirstName || r.decedentFirstName || "";
      const last  = r.decLastName || r.decedentLastName || "";

      const ownerRaw = r.ownerId ?? r.userId;
      const ownerId  = ownerRaw ? String(ownerRaw) : "";
      const ownerEmail = ownerId && ownerEmailById[ownerId] ? ownerEmailById[ownerId] : "";

      const policies = Array.isArray(r.policyNumbers)
        ? r.policyNumbers.join(", ")
        : (r.policyNumbers || "");

      return {
        id: String(r._id),
        decName: [first, last].filter(Boolean).join(" "),
        insuranceCompany: companyDisplay,
        policyNumbers: policies,
        createdAt: r.createdAt,
        fhRep: r.fhRep || "",
        assignmentAmount: r.assignmentAmount || "",
        status: r.status || "Submitted",
        userId: ownerId,
        ownerEmail,
      };
    });

    return NextResponse.json({ requests });
  } catch (err: any) {
    // Surface the message during debugging; switch to generic in prod if you prefer
    console.error("[admin requests] error:", err);
    const msg = typeof err?.message === "string" ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
