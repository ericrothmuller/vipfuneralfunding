// app/api/requests/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { FundingRequest } from "@/models/FundingRequest";

import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import mongoose from "mongoose";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/home/deploy/uploads/vipfuneralfunding";
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB
const MAX_OTHER_UPLOADS = 50;
const MAX_ASSIGNMENT_UPLOADS = 10;          // NEW: up to 10 assignment files

/* -------------------- helpers -------------------- */
function moneyToNumber(v: any): number {
  if (v == null) return 0;
  const s = String(v).replace(/[^0-9.-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
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

  console.log("[upload] saved", { absolute, relative, size: total });
  return { relative, absolute };
}

/* -------------------- GET: list current user's requests -------------------- */
export async function GET(req: Request) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    // support BOTH legacy userId and new ownerId
    const meId = new mongoose.Types.ObjectId(me.sub);
    const and: any[] = [{ $or: [{ userId: meId }, { ownerId: meId }] }];

    if (q) {
      const rx = { $regex: q, $options: "i" };
      and.push({
        $or: [
          { decFirstName: rx },        // legacy
          { decLastName: rx },         // legacy
          { decedentFirstName: rx },   // new
          { decedentLastName: rx },    // new
          { policyNumbers: rx },
          { insuranceCompany: rx },
          { "otherInsuranceCompany.name": rx },
        ],
      });
    }

    const find: any = and.length > 1 ? { $and: and } : and[0];

    const rows = await FundingRequest.find(find)
      .sort({ createdAt: -1 })
      .select(
        "decFirstName decLastName decedentFirstName decedentLastName insuranceCompanyId otherInsuranceCompany insuranceCompany policyNumbers createdAt fhRep assignmentAmount status"
      )
      .populate({ path: "insuranceCompanyId", select: "name" })
      .lean();

    const requests = rows.map((r: any) => {
      const companyDisplay =
        (r.insuranceCompanyId && r.insuranceCompanyId.name) ||
        (r.otherInsuranceCompany?.name) ||
        r.insuranceCompany || "";

      const first = r.decFirstName || r.decedentFirstName || "";
      const last  = r.decLastName || r.decedentLastName || "";

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
      };
    });

    return NextResponse.json({ requests });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* -------------------- POST: create a request (multipart/json) -------------------- */
export async function POST(req: Request) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const ctype = req.headers.get("content-type") || "";
    console.log("[upload] content-type:", ctype);

    let body: any = {};
    let assignmentRelative: string | undefined;
    let assignmentRelatives: string[] = []; // NEW
    let otherRelatives: string[] = [];

    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();

      // Assignment (accept both legacy single and new plural)
      const legacySingle = form.get("assignmentUpload");
      const multi = form.getAll("assignmentUploads");

      // normalize to File[]
      const assignmentFiles: File[] = [];
      if (legacySingle && legacySingle instanceof File && legacySingle.size > 0) {
        assignmentFiles.push(legacySingle);
      }
      for (const v of multi) {
        if (v instanceof File && v.size > 0) assignmentFiles.push(v);
      }

      if (assignmentFiles.length > MAX_ASSIGNMENT_UPLOADS) {
        return NextResponse.json(
          { error: `Too many assignment files. Max ${MAX_ASSIGNMENT_UPLOADS}.` },
          { status: 400 }
        );
      }

      for (const f of assignmentFiles) {
        const saved = await streamToFile(f);
        assignmentRelatives.push(saved.relative);
      }
      assignmentRelative = assignmentRelatives[0]; // keep legacy populated with the first

      // Other uploads (up to 50)
      const others = form.getAll("otherUploads").filter((v) => v instanceof File) as File[];
      if (others.length > MAX_OTHER_UPLOADS) {
        return NextResponse.json({ error: `Too many files. Max ${MAX_OTHER_UPLOADS}.` }, { status: 400 });
      }
      for (const f of others) {
        if (f.size > 0) {
          const saved = await streamToFile(f);
          otherRelatives.push(saved.relative);
        }
      }

      const text = (k: string) => (form.get(k) ? String(form.get(k)) : "");
      const bool = (k: string) => toBool(form.get(k));

      const insuranceCompanyMode = text("insuranceCompanyMode");
      const insuranceCompanyId = text("insuranceCompanyId");
      const otherIC = {
        name: text("otherIC_name"),
        phone: text("otherIC_phone"),
        fax: text("otherIC_fax"),
        notes: text("otherIC_notes"),
      };

      body = {
        fhName: text("fhName"),
        fhRep: text("fhRep"),
        contactPhone: text("contactPhone"),
        contactEmail: text("contactEmail"),

        // legacy names (kept for compat)
        decFirstName: text("decFirstName"),
        decLastName: text("decLastName"),
        // new mirror
        decedentFirstName: text("decFirstName"),
        decedentLastName: text("decLastName"),

        decSSN: text("decSSN"),
        decMaritalStatus: text("decMaritalStatus"),
        decAddress: text("decAddress"),
        decCity: text("decCity"),
        decState: text("decState"),
        decZip: text("decZip"),

        decPODCity: text("decPODCity"),
        decPODState: text("decPODState"),
        decPODCountry: text("decPODCountry"),

        employerPhone: text("employerPhone"),
        employerContact: text("employerContact"),
        employmentStatus: text("employmentStatus"),
        employerRelation: text("employerRelation"),

        policyNumbers: text("policyNumbers"),
        faceAmount: text("faceAmount"),
        beneficiaries: text("beneficiaries"),
        policyBundles: text("policyBundles"),

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

      body.deathInUS = text("deathInUS"); // "Yes"/"No"
      body.codNatural  = text("codNatural");   // "Yes"/"No"
      body.codAccident = text("codAccident");
      body.codHomicide = text("codHomicide");
      body.codPending  = text("codPending");
      body.hasFinalDC  = text("hasFinalDC");

      // legacy toggles (if still used)
      body.otherFHTakingAssignment = bool("otherFHTakingAssignment");
      body.otherFHName   = text("otherFHName");
      body.otherFHAmount = text("otherFHAmount");

      // IC mode
      if (insuranceCompanyMode === "id" && insuranceCompanyId) {
        body.insuranceCompanyId = insuranceCompanyId;
        body.otherInsuranceCompany = { name: "", phone: "", fax: "", notes: "" };
      } else if (insuranceCompanyMode === "other" && otherIC.name) {
        body.insuranceCompanyId = null;
        body.otherInsuranceCompany = otherIC;
      } else {
        body.insuranceCompanyId = null;
        body.otherInsuranceCompany = { name: "", phone: "", fax: "", notes: "" };
      }
    } else {
      // JSON fallback (not typical with uploads)
      const json = await req.json().catch(() => ({}));
      body = json || {};
      if (body.decFirstName && !body.decedentFirstName) body.decedentFirstName = body.decFirstName;
      if (body.decLastName && !body.decedentLastName) body.decedentLastName = body.decLastName;
    }

    // ---- Normalize numeric currency fields ----
    const nTotal = moneyToNumber(body.totalServiceAmount);
    const nFamily = moneyToNumber(body.familyAdvancementAmount);
    let nVip = moneyToNumber(body.vipFee);
    if (!nVip) {
      const base = nTotal + nFamily;
      const pct = Math.round(base * 0.03 * 100) / 100;
      nVip = Math.max(100, pct);
    }
    let nAssign = moneyToNumber(body.assignmentAmount);
    if (!nAssign) nAssign = nTotal + nFamily + nVip;

    // ---- Legacy "insuranceCompany" display string (optional)
    let insuranceCompanyDisplay = "";
    if (body.insuranceCompanyId) insuranceCompanyDisplay = "";
    else if (body.otherInsuranceCompany?.name) insuranceCompanyDisplay = body.otherInsuranceCompany.name;

    // ---- Create document; write BOTH userId and ownerId for compat
    const meId = new mongoose.Types.ObjectId(me.sub);
    const doc = await FundingRequest.create({
      userId: meId,                 // legacy
      ownerId: meId,                // new

      // names (both legacy & new for cross-compat)
      decFirstName: body.decFirstName || body.decedentFirstName || "",
      decLastName: body.decLastName || body.decedentLastName || "",
      decedentFirstName: body.decedentFirstName || body.decFirstName || "",
      decedentLastName: body.decedentLastName || body.decLastName || "",

      insuranceCompanyId: body.insuranceCompanyId || null,
      otherInsuranceCompany: body.otherInsuranceCompany || { name: "", phone: "", fax: "", notes: "" },
      insuranceCompany: insuranceCompanyDisplay || undefined,

      policyNumbers: splitList(body.policyNumbers),
      beneficiaries: splitList(body.beneficiaries),

      totalServiceAmount: nTotal,
      familyAdvancementAmount: nFamily,
      vipFee: nVip,
      assignmentAmount: nAssign,

      fhName: body.fhName,
      fhRep: body.fhRep,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail,

      decSSN: body.decSSN,
      decMaritalStatus: body.decMaritalStatus,
      decAddress: body.decAddress,
      decCity: body.decCity,
      decState: body.decState,
      decZip: body.decZip,

      decPODCity: body.decPODCity,
      decPODState: body.decPODState,
      decPODCountry: body.decPODCountry,
      deathInUS: body.deathInUS === "Yes",

      codNatural: body.codNatural === "Yes",
      codAccident: body.codAccident === "Yes",
      codHomicide: body.codHomicide === "Yes",
      codPending: body.codPending === "Yes",
      hasFinalDC: body.hasFinalDC === "Yes",

      employerPhone: body.employerPhone,
      employerContact: body.employerContact,
      employmentStatus: body.employmentStatus,
      employerRelation: body.employerRelation,

      notes: body.notes,

      // uploads
      ...(assignmentRelative ? { assignmentUploadPath: assignmentRelative } : {}),
      ...(assignmentRelatives.length ? { assignmentUploadPaths: assignmentRelatives } : {}),
      ...(otherRelatives.length ? { otherUploadPaths: otherRelatives } : {}),

      status: "Submitted",
    });

    console.log("[upload] created request", {
      id: String(doc._id),
      assignment: assignmentRelative,
      assignmentsCount: assignmentRelatives.length,
      others: otherRelatives.length,
    });

    return NextResponse.json({ ok: true, id: String(doc._id) }, { status: 201 });
  } catch (err: any) {
    console.error("[upload] error", err);
    const msg = typeof err?.message === "string" ? err.message : "Server error";
    const code = msg.includes("File too large") ? 413 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
