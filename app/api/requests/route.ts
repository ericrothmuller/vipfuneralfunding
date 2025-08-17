// app/api/requests/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { FundingRequest } from "@/models/FundingRequest";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function GET() {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const rows = await FundingRequest
      .find({ userId: me.sub })
      .sort({ createdAt: -1 })
      .select("decFirstName decLastName insuranceCompany policyNumbers createdAt fhRep assignmentAmount")
      .lean();

    const data = rows.map(r => ({
      id: String((r as any)._id),
      decName: [r.decFirstName, r.decLastName].filter(Boolean).join(" "),
      insuranceCompany: r.insuranceCompany || "",
      policyNumbers: r.policyNumbers || "",
      createdAt: r.createdAt,
      fhRep: (r as any).fhRep || "",
      assignmentAmount: r.assignmentAmount || "",
    }));

    return NextResponse.json({ requests: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    // Accept multipart form to allow file upload
    const form = await req.formData();

    // Helper to read string field safely
    const S = (name: string) => String(form.get(name) ?? "");

    // Booleans
    const B = (name: string) => {
      const v = form.get(name);
      if (v === null) return false;
      const s = String(v).toLowerCase();
      return s === "true" || s === "on" || s === "yes" || s === "1";
    };

    // Dates
    const D = (name: string) => {
      const v = S(name).trim();
      if (!v) return null;
      const dt = new Date(v);
      return isNaN(dt.getTime()) ? null : dt;
    };

    // Save optional file
    let assignmentUploadPath = "";
    const file = form.get("assignmentUpload") as File | null;
    if (file && typeof file.name === "string" && file.size > 0) {
      await ensureUploadDir();
      const ext = path.extname(file.name || "").toLowerCase() || ".bin";
      const id = crypto.randomUUID();
      const fname = `${id}${ext}`;
      const fullPath = path.join(UPLOAD_DIR, fname);
      const buf = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(fullPath, buf);
      assignmentUploadPath = `/uploads/${fname}`; // served by Next static if you add public mapping later; right now it's just a stored path
    }

    const doc = await FundingRequest.create({
      userId: me.sub,

      fhName: S("fhName"),
      fhRep: S("fhRep"),
      contactPhone: S("contactPhone"),
      contactEmail: S("contactEmail"),

      decFirstName: S("decFirstName"),
      decLastName: S("decLastName"),
      decSSN: S("decSSN"),
      decDOB: D("decDOB"),
      decDOD: D("decDOD"),
      decMaritalStatus: S("decMaritalStatus"),

      decAddress: S("decAddress"),
      decCity: S("decCity"),
      decState: S("decState"),
      decZip: S("decZip"),

      decPODCity: S("decPODCity"),
      decPODState: S("decPODState"),
      deathInUS: B("deathInUS"),

      codNatural: B("codNatural"),
      codAccident: B("codAccident"),
      codHomicide: B("codHomicide"),
      codPending: B("codPending"),
      codSuicide: B("codSuicide"),

      hasFinalDC: B("hasFinalDC"),
      otherFHTakingAssignment: B("otherFHTakingAssignment"),
      otherFHName: S("otherFHName"),
      otherFHAmount: S("otherFHAmount"),

      employerPhone: S("employerPhone"),
      employerContact: S("employerContact"),
      employmentStatus: S("employmentStatus"),

      insuranceCompany: S("insuranceCompany"),
      policyNumbers: S("policyNumbers"),
      faceAmount: S("faceAmount"),
      beneficiaries: S("beneficiaries"),

      totalServiceAmount: S("totalServiceAmount"),
      familyAdvancementAmount: S("familyAdvancementAmount"),
      vipFee: S("vipFee"),
      assignmentAmount: S("assignmentAmount"),

      notes: S("notes"),
      assignmentUploadPath,
    });

    return NextResponse.json({ ok: true, id: String((doc as any)._id) }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
