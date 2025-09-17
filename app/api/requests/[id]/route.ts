// app/api/requests/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { FundingRequest } from "@/models/FundingRequest";
import { User } from "@/models/User"; // ⬅ NEW: to check FH/CEM linkage

import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import mongoose from "mongoose";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/home/deploy/uploads/vipfuneralfunding";
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB
const MAX_OTHER_UPLOADS = 50;
const MAX_ASSIGNMENT_UPLOADS = 10;

/* -------------------- helpers -------------------- */
function moneyToNumber(v: any): number {
  if (v == null) return 0;
  const s = String(v).replace(/[^0-9.-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function parseDate(v: string | null): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}
function safeExt(filename?: string | null): string {
  if (!filename) return ".bin";
  const ext = path.extname(String(filename)).toLowerCase();
  if (!ext) return ".bin";
  const ok = new Set([
    ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".tif", ".tiff", ".doc", ".docx", ".txt",
  ]);
  return ok.has(ext) ? ext : ".bin";
}
function splitList(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof val === "string") {
    return val.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}
async function streamToFile(file: File): Promise<{ relative: string; absolute: string }> {
  if (file.size <= 0) throw new Error("Empty file");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File too large (>500 MB)");

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const subdir = path.join(yyyy, mm); // "YYYY/MM"

  const root = path.resolve(UPLOAD_DIR);
  const dir = path.join(root, subdir);
  await fs.mkdir(dir, { recursive: true, mode: 0o755 });

  const ext = safeExt((file as any).name);
  const filename = `${randomUUID()}${ext}`;
  const absolute = path.join(dir, filename);
  const relative = path.join(subdir, filename).replace(/\\/g, "/");

  const webStream = file.stream();
  const nodeStream: NodeJS.ReadableStream =
    typeof (Readable as any).fromWeb === "function"
      ? ((Readable as any).fromWeb(webStream) as NodeJS.ReadableStream)
      : ((webStream as unknown) as NodeJS.ReadableStream);

  let total = 0;
  const limiter = new Transform({
    transform(chunk, _enc, cb) {
      total += chunk.length;
      if (total > MAX_UPLOAD_BYTES) cb(new Error("File too large (>500 MB)"));
      else cb(null, chunk);
    },
  });

  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(absolute, { mode: 0o640 });
    nodeStream.pipe(limiter).pipe(out).on("finish", resolve).on("error", reject);
  });

  return { relative, absolute };
}

function canView(me: any, doc: any): boolean {
  if (!me) return false;
  if (me.role === "ADMIN") return true;
  if (me.role === "NEW") return false;
  const meId = String(me.sub);
  return String(doc.ownerId || doc.userId) === meId;
}
function canEdit(me: any, doc: any): boolean {
  if (!me) return false;
  if (me.role === "ADMIN") return true;
  if (me.role === "NEW") return false;
  // FH/CEM can edit only while Submitted AND must be owner (we'll extend below)
  const meId = String(me.sub);
  return (doc.status === "Submitted") && (String(doc.ownerId || doc.userId) === meId);
}
function canDelete(me: any, doc: any): boolean {
  if (!me) return false;
  if (me.role === "ADMIN") return true;
  if (me.role === "NEW") return false;
  const meId = String(me.sub);
  return (doc.status === "Submitted") && (String(doc.ownerId || doc.userId) === meId);
}

/** extra allow for FH/CEM: same org (fhCemId) or legacy fhName match */
async function fhcemExtraAllow(me: any, doc: any): Promise<boolean> {
  if (!me || me.role !== "FH_CEM") return false;
  const meUser = await User.findById(me.sub).select("fhCemId fhName").lean();
  if (!meUser) return false;

  // same linked FH/CEM id
  if (meUser.fhCemId && doc?.fhCemId && String(meUser.fhCemId) === String(doc.fhCemId)) {
    return true;
  }
  // legacy name fallback (case-insensitive)
  const a = (meUser.fhName || "").trim().toLowerCase();
  const b = (doc?.fhName || "").trim().toLowerCase();
  if (a && b && a === b) return true;

  return false;
}

/* -------------------- GET: request details -------------------- */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const doc: any = await FundingRequest.findById(id).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // existing owner/admin rule OR same FH/CEM org (id/name)
    let allowed = canView(me, doc);
    if (!allowed && me.role === "FH_CEM") {
      allowed = await fhcemExtraAllow(me, doc);
    }
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const response = {
      id: String(doc._id),
      userId: String(doc.ownerId || doc.userId || ""),

      fhName: doc.fhName || "",
      fhRep: doc.fhRep || "",
      contactPhone: doc.contactPhone || "",
      contactEmail: doc.contactEmail || "",

      decFirstName: doc.decFirstName || doc.decedentFirstName || "",
      decLastName: doc.decLastName || doc.decedentLastName || "",
      decSSN: doc.decSSN || "",
      decDOB: doc.decDOB || null,
      decDOD: doc.decDOD || null,
      decMaritalStatus: doc.decMaritalStatus || "",

      decAddress: doc.decAddress || "",
      decCity: doc.decCity || "",
      decState: doc.decState || "",
      decZip: doc.decZip || "",

      decPODCity: doc.decPODCity || "",
      decPODState: doc.decPODState || "",
      decPODCountry: doc.decPODCountry || "",
      deathInUS: !!doc.deathInUS,

      codNatural: !!doc.codNatural,
      codAccident: !!doc.codAccident,
      codHomicide: !!doc.codHomicide,
      codPending: !!doc.codPending,
      codSuicide: !!doc.codSuicide,

      hasFinalDC: !!doc.hasFinalDC,

      employerPhone: doc.employerPhone || "",
      employerContact: doc.employerContact || "",
      employmentStatus: doc.employmentStatus || "",
      employerRelation: doc.employerRelation || "",

      insuranceCompanyId: doc.insuranceCompanyId || null,
      otherInsuranceCompany: doc.otherInsuranceCompany || null,
      insuranceCompany: doc.insuranceCompany || "",

      policyNumbers: Array.isArray(doc.policyNumbers) ? doc.policyNumbers.join(", ") : (doc.policyNumbers || ""),
      faceAmount: doc.faceAmount || "",
      beneficiaries: Array.isArray(doc.beneficiaries) ? doc.beneficiaries.join(", ") : (doc.beneficiaries || ""),

      totalServiceAmount: (typeof doc.totalServiceAmount === "number" ? doc.totalServiceAmount.toLocaleString("en-US", { style: "currency", currency: "USD" }) : (doc.totalServiceAmount || "")),
      familyAdvancementAmount: (typeof doc.familyAdvancementAmount === "number" ? doc.familyAdvancementAmount.toLocaleString("en-US", { style: "currency", currency: "USD" }) : (doc.familyAdvancementAmount || "")),
      vipFee: (typeof doc.vipFee === "number" ? doc.vipFee.toLocaleString("en-US", { style: "currency", currency: "USD" }) : (doc.vipFee || "")),
      assignmentAmount: (typeof doc.assignmentAmount === "number" ? doc.assignmentAmount.toLocaleString("en-US", { style: "currency", currency: "USD" }) : (doc.assignmentAmount || "")),

      notes: doc.notes || "",

      assignmentUploadPath: doc.assignmentUploadPath || "",
      assignmentUploadPaths: Array.isArray(doc.assignmentUploadPaths) ? doc.assignmentUploadPaths : [],
      otherUploadPaths: Array.isArray(doc.otherUploadPaths) ? doc.otherUploadPaths : [],

      status: doc.status || "Submitted",
      createdAt: doc.createdAt || null,
      updatedAt: doc.updatedAt || null,
    };

    return NextResponse.json({ request: response }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* -------------------- PUT: update (multipart/json), gated -------------------- */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const doc: any = await FundingRequest.findById(id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // existing owner/admin rule
    let allowedEdit = canEdit(me, doc);
    // extra allow for FH/CEM: same org (id/name) AND status === "Submitted"
    if (!allowedEdit && me.role === "FH_CEM" && doc.status === "Submitted") {
      allowedEdit = await fhcemExtraAllow(me, doc);
    }
    if (!allowedEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const ctype = req.headers.get("content-type") || "";
    let body: Record<string, any> = {};
    let addedAssignments: string[] = [];
    let addedOthers: string[] = [];

    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();

      // text helpers
      const text = (k: string) => (form.get(k) ? String(form.get(k)) : "");

      // gather uploads (append)
      const existingAssigns = Array.isArray(doc.assignmentUploadPaths) ? doc.assignmentUploadPaths.length : (doc.assignmentUploadPath ? 1 : 0);
      const newAssignFiles = (form.getAll("assignmentUploads") || []).filter((x): x is File => x instanceof File && x.size > 0);
      if (existingAssigns + newAssignFiles.length > MAX_ASSIGNMENT_UPLOADS) {
        return NextResponse.json({ error: `Too many assignment files. Max ${MAX_ASSIGNMENT_UPLOADS} total.` }, { status: 400 });
      }
      for (const f of newAssignFiles) {
        const saved = await streamToFile(f);
        addedAssignments.push(saved.relative);
      }

      const existingOthers = Array.isArray(doc.otherUploadPaths) ? doc.otherUploadPaths.length : 0;
      const newOtherFiles = (form.getAll("otherUploads") || []).filter((x): x is File => x instanceof File && x.size > 0);
      if (existingOthers + newOtherFiles.length > MAX_OTHER_UPLOADS) {
        return NextResponse.json({ error: `Too many other documents. Max ${MAX_OTHER_UPLOADS} total.` }, { status: 400 });
      }
      for (const f of newOtherFiles) {
        const saved = await streamToFile(f);
        addedOthers.push(saved.relative);
      }

      // common editable fields
      body.fhRep = text("fhRep");
      body.contactPhone = text("contactPhone");
      body.contactEmail = text("contactEmail");

      body.decFirstName = text("decFirstName");
      body.decLastName  = text("decLastName");
      const dob = text("decDOB");
      const dod = text("decDOD");
      if (dob) doc.decDOB = parseDate(dob);
      if (dod) doc.decDOD = parseDate(dod);
      body.decSSN = text("decSSN");
      body.decMaritalStatus = text("decMaritalStatus");

      body.decAddress = text("decAddress");
      body.decCity = text("decCity");
      body.decState = text("decState");
      body.decZip = text("decZip");

      body.decPODCity = text("decPODCity");
      body.decPODState = text("decPODState");
      body.decPODCountry = text("decPODCountry");
      const deathInUS = text("deathInUS");
      if (deathInUS) doc.deathInUS = deathInUS === "Yes";

      // COD flags (single -> flags)
      doc.codNatural  = text("codNatural") === "Yes";
      doc.codAccident = text("codAccident") === "Yes";
      doc.codHomicide = text("codHomicide") === "Yes";
      doc.codPending  = text("codPending") === "Yes";
      const hasFinalDC = text("hasFinalDC");
      if (hasFinalDC) doc.hasFinalDC = hasFinalDC === "Yes";

      // employer
      const er = text("employerRelation");
      if (er) doc.employerRelation = er;
      doc.employerPhone = text("employerPhone");
      doc.employerContact = text("employerContact");
      doc.employmentStatus = text("employmentStatus");

      // policy/basic strings
      const pnums = text("policyNumbers"); if (pnums) doc.policyNumbers = splitList(pnums);
      doc.faceAmount = text("faceAmount");
      const bens = text("beneficiaries"); if (bens) doc.beneficiaries = splitList(bens);

      // financials (store normalized numbers)
      const nTotal = moneyToNumber(text("totalServiceAmount"));
      const nFamily = moneyToNumber(text("familyAdvancementAmount"));
      const nVip = moneyToNumber(text("vipFee"));
      const nAssign = moneyToNumber(text("assignmentAmount"));
      if (!isNaN(nTotal)) doc.totalServiceAmount = nTotal;
      if (!isNaN(nFamily)) doc.familyAdvancementAmount = nFamily;
      if (!isNaN(nVip)) doc.vipFee = nVip;
      if (!isNaN(nAssign)) doc.assignmentAmount = nAssign;

      doc.notes = text("notes");
    } else {
      // JSON fallback
      const json = await req.json().catch(() => ({}));
      body = json || {};
    }

    // apply text/boolean changes collected in 'body'
    for (const [k, v] of Object.entries(body)) {
      (doc as any)[k] = v;
    }

    // append uploads
    if (addedAssignments.length) {
      if (!Array.isArray(doc.assignmentUploadPaths)) doc.assignmentUploadPaths = [];
      doc.assignmentUploadPaths.push(...addedAssignments);
      if (!doc.assignmentUploadPath) {
        // if legacy single empty, set first for backward compat
        doc.assignmentUploadPath = doc.assignmentUploadPaths[0];
      }
    }
    if (addedOthers.length) {
      if (!Array.isArray(doc.otherUploadPaths)) doc.otherUploadPaths = [];
      doc.otherUploadPaths.push(...addedOthers);
    }

    await doc.save();

    // respond using GET’s shape
    const res = await GET(new Request(""), { params: { id } });
    const json = await (res as any).json();
    return NextResponse.json(json, { status: 200 });
  } catch (err: any) {
    console.error("[request PUT] error", err);
    const msg = typeof err?.message === "string" ? err.message : "Server error";
    const code = msg.includes("File too large") ? 413 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

/* -------------------- DELETE: gated -------------------- */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const doc: any = await FundingRequest.findById(id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canDelete(me, doc)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await FundingRequest.deleteOne({ _id: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
