// app/api/requests/[id]/verification/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { FundingRequest } from "@/models/FundingRequest";
import { Verification } from "@/models/Verification";
import mongoose from "mongoose";

function companyDisplay(r: any): string {
  return (
    (r.insuranceCompanyId && r.insuranceCompanyId.name) ||
    (r.otherInsuranceCompany?.name) ||
    r.insuranceCompany ||
    ""
  );
}

// GET: load prefill + any existing verification for a funding request (ADMIN only)
export async function GET(_req: Request, context: any) {
  try {
    const me = await getUserFromCookie();
    if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await (context?.params ?? {});
    if (!id || !mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await connectDB();

    const fr: any = await FundingRequest.findById(id)
      .select(
        "decFirstName decLastName decSSN policyNumbers insuranceCompany insuranceCompanyId otherInsuranceCompany"
      )
      .populate({ path: "insuranceCompanyId", select: "name" })
      .lean();

    if (!fr) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const prefill = {
      insuranceCompany: companyDisplay(fr),
      policyNumbers: fr.policyNumbers || "",
      insuredFirstName: fr.decFirstName || "",
      insuredLastName: fr.decLastName || "",
      insuredSSN: fr.decSSN || "",
    };

    const existing = await Verification.findOne({ fundingRequestId: id }).lean();

    return NextResponse.json({
      prefill,
      verification: existing || null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT: upsert verification answers (ADMIN only)
export async function PUT(req: Request, context: any) {
  try {
    const me = await getUserFromCookie();
    if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await (context?.params ?? {});
    if (!id || !mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    await connectDB();

    // Ensure prefill snapshot stays in sync with Funding Request
    const fr: any = await FundingRequest.findById(id)
      .select(
        "decFirstName decLastName decSSN policyNumbers insuranceCompany insuranceCompanyId otherInsuranceCompany"
      )
      .populate({ path: "insuranceCompanyId", select: "name" })
      .lean();
    if (!fr) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const snapshot = {
      insuranceCompany: companyDisplay(fr),
      policyNumbers: fr.policyNumbers || "",
      insuredFirstName: fr.decFirstName || "",
      insuredLastName: fr.decLastName || "",
      insuredSSN: fr.decSSN || "",
    };

    const update: any = {
      ...snapshot,
      active: !!body.active,
      inForce: !!body.inForce,
      receivedAssignment: !!body.receivedAssignment,
      primaryBeneficiaries: body.primaryBeneficiaries || "",
      contingentBeneficiaries: body.contingentBeneficiaries || "",
      acceptsThirdPartyAssignments: !!body.acceptsThirdPartyAssignments,
      otherAssignments: !!body.otherAssignments,
      claimAlreadyFiled: !!body.claimAlreadyFiled,
      assignmentSignedByBenes: !!body.assignmentSignedByBenes,
      policyType: body.policyType || "",
      issueDate: body.issueDate ? new Date(body.issueDate) : null,
      reinstated: !!body.reinstated,
      contestable: !!body.contestable,
      faceAmount: body.faceAmount || "",
      loans: body.loans || "",
      totalBenefitAmount: body.totalBenefitAmount || "",
      signingBenesPortionCoverAssignment: !!body.signingBenesPortionCoverAssignment,
      documentsNeeded: body.documentsNeeded || "",
      notes: body.notes || "",
    };

    await Verification.findOneAndUpdate(
      { fundingRequestId: id },
      { $set: update, $setOnInsert: { fundingRequestId: id } },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
