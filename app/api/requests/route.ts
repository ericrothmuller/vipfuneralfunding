// app/api/requests/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { FundingRequest } from "@/models/FundingRequest";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/home/deploy/uploads/vipfuneralfunding";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB

function safeExt(filename?: string | null): string {
  if (!filename) return ".bin";
  const ext = path.extname(String(filename)).toLowerCase();
  if (!ext) return ".bin";
  const ok = new Set([
    ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".tif", ".tiff", ".doc", ".docx", ".txt"
  ]);
  return ok.has(ext) ? ext : ".bin";
}
function toBool(v: FormDataEntryValue | null): boolean {
  if (v == null) return false;
  const s = String(v).toLowerCase();
  return s === "true" || s === "1" || s === "on" || s === "yes";
}
function parseDate(v: string | null): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

async function saveUploadedFile(file: File): Promise<{ relative: string; absolute: string }> {
  if (file.size <= 0) throw new Error("Empty file");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File too large");

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const subdir = path.join(yyyy, mm); // "YYYY/MM"

  const root = path.resolve(UPLOAD_DIR);
  const dir = path.join(root, subdir);
  await fs.mkdir(dir, { recursive: true, mode: 0o755 });

  const ext = safeExt(file.name);
  const filename = `${randomUUID()}${ext}`;
  const absolute = path.join(dir, filename);
  const relative = path.join(subdir, filename).replace(/\\/g, "/");

  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolute, buf, { mode: 0o640 });

  console.log("[upload] saved", { absolute, relative, size: buf.length });
  return { relative, absolute };
}

export async function GET() {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // list the current user's requests (admins can get a separate endpoint if needed)
    await connectDB();
    const rows = await FundingRequest.find({ userId: me.sub })
      .sort({ createdAt: -1 })
      .select("decFirstName decLastName insuranceCompany policyNumbers createdAt fhRep assignmentAmount status")
      .lean();

    const data = rows.map((r: any) => ({
      id: String(r._id),
      decName: [r.decFirstName, r.decLastName].filter(Boolean).join(" "),
      insuranceCompany: r.insuranceCompany || "",
      policyNumbers: r.policyNumbers || "",
      createdAt: r.createdAt,
      fhRep: r.fhRep || "",
      assignmentAmount: r.assignmentAmount || "",
      status: r.status || "Submitted",
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
    if (me.role === "NEW") return NextResponse.json({ error: "Approval required before submitting." }, { status: 403 });

    await connectDB();

    const ctype = req.headers.get("content-type") || "";
    console.log("[upload] content-type:", ctype);
    let body: any = {};
    let assignmentRelative: string | undefined;

    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();

      // File first (name MUST be 'assignmentUpload')
      const file = form.get("assignmentUpload");
      if (file && file instanceof File && file.size > 0) {
        console.log("[upload] incoming file:", { name: file.name, size: file.size, type: file.type });
        const saved = await saveUploadedFile(file);
        assignmentRelative = saved.relative; // store RELATIVE path
      } else {
        console.log("[upload] no file field named 'assignmentUpload' or empty file");
      }

      const text = (k: string) => (form.get(k) ? String(form.get(k)) : "");

      body = {
        fhName: text("fhName"),
        fhRep: text("fhRep"),
        contactPhone: text("contactPhone"),
        contactEmail: text("contactEmail"),

        decFirstName: text("decFirstName"),
        decLastName: text("decLastName"),
        decSSN: text("decSSN"),
        decMaritalStatus: text("decMaritalStatus"),
        decAddress: text("decAddress"),
        decCity: text("decCity"),
        decState: text("decState"),
        decZip: text("decZip"),
        decPODCity: text("decPODCity"),
        decPODState: text("decPODState"),

        employerPhone: text("employerPhone"),
        employerContact: text("employerContact"),
        employmentStatus: text("employmentStatus"),

        insuranceCompany: text("insuranceCompany"),
        policyNumbers: text("policyNumbers"),
        faceAmount: text("faceAmount"),
        beneficiaries: text("beneficiaries"),

        totalServiceAmount: text("totalServiceAmount"),
        familyAdvancementAmount: text("familyAdvancementAmount"),
        vipFee: text("vipFee"),
        assignmentAmount: text("assignmentAmount"),

        notes: text("notes"),
      };

      const dob = text("decDOB");
      const dod = text("decDOD");
      if (dob) body.decDOB = parseDate(dob);
      if (dod) body.decDOD = parseDate(dod);

      body.deathInUS = toBool(form.get("deathInUS"));
      body.codNatural = toBool(form.get("codNatural"));
      body.codAccident = toBool(form.get("codAccident"));
      body.codHomicide = toBool(form.get("codHomicide"));
      body.codPending = toBool(form.get("codPending"));
      body.codSuicide = toBool(form.get("codSuicide"));
      body.hasFinalDC = toBool(form.get("hasFinalDC"));
      body.otherFHTakingAssignment = toBool(form.get("otherFHTakingAssignment"));
      body.otherFHName = text("otherFHName");
      body.otherFHAmount = text("otherFHAmount");

    } else {
      // Fallback (no file)
      console.log("[upload] non-multipart request; no file will be saved");
      const json = await req.json().catch(() => ({}));
      body = json || {};
    }

    const doc = await FundingRequest.create({
      userId: me.sub,
      ...body,
      ...(assignmentRelative ? { assignmentUploadPath: assignmentRelative } : {}),
    });

    console.log("[upload] created request", { id: String(doc._id), assignmentUploadPath: assignmentRelative });
    return NextResponse.json({ ok: true, id: String(doc._id) }, { status: 201 });
  } catch (err: any) {
    console.error("[upload] error", err);
    const msg = typeof err?.message === "string" ? err.message : "Server error";
    const code = msg.includes("File too large") ? 413 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
