// app/api/admin/insurance-companies/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { InsuranceCompany } from "@/models/InsuranceCompany";
import mongoose from "mongoose";

function isAdmin(me: any) {
  return me && me.role === "ADMIN";
}

// GET /api/admin/insurance-companies/:id
export async function GET(_req: Request, context: any) {
  try {
    const me = await getUserFromCookie();
    if (!isAdmin(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await (context?.params ?? {});
    if (!id || !mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await connectDB();
    const doc: any = await InsuranceCompany.findById(id).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      item: {
        id: String(doc._id),
        name: doc.name,
        email: doc.email || "",
        phone: doc.phone || "",
        fax: doc.fax || "",
        mailingAddress: doc.mailingAddress || "",
        verificationTime: doc.verificationTime || "",
        documentsToFund: doc.documentsToFund || "",
        acceptsAdvancements: !!doc.acceptsAdvancements,
        notes: doc.notes || "",
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/admin/insurance-companies/:id
export async function PATCH(req: Request, context: any) {
  try {
    const me = await getUserFromCookie();
    if (!isAdmin(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await (context?.params ?? {});
    if (!id || !mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    await connectDB();

    const update: any = {};
    if (typeof body?.name === "string") update.name = body.name.trim();
    if (typeof body?.email === "string") update.email = body.email;
    if (typeof body?.phone === "string") update.phone = body.phone;
    if (typeof body?.fax === "string") update.fax = body.fax;
    if (typeof body?.mailingAddress === "string") update.mailingAddress = body.mailingAddress;
    if (typeof body?.verificationTime === "string") update.verificationTime = body.verificationTime;
    if (typeof body?.documentsToFund === "string") update.documentsToFund = body.documentsToFund;
    if (typeof body?.acceptsAdvancements === "boolean") update.acceptsAdvancements = body.acceptsAdvancements;
    if (typeof body?.notes === "string") update.notes = body.notes;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await InsuranceCompany.findByIdAndUpdate(
      id,
      update,
      { new: true, select: "_id" }
    ).lean();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/admin/insurance-companies/:id
export async function DELETE(_req: Request, context: any) {
  try {
    const me = await getUserFromCookie();
    if (!isAdmin(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await (context?.params ?? {});
    if (!id || !mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await connectDB();
    const deleted = await InsuranceCompany.findByIdAndDelete(id).lean();
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
