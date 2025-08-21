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

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/home/deploy/uploads/vipfuneralfunding";
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

/** Allow-listed extensions (we still detect type on download) */
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

/** Stream a Web File to disk under UPLOAD_DIR/YYYY/MM/uuid.ext, return relative+absolute paths */
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

  const ext = safeExt(file.name);
  const filename = `${randomUUID()}${ext}`;
  const absolute = path.join(dir, filename);
  const relative = path.join(subdir, filename).replace(/\\/g, "/");

  // Convert Web ReadableStream → Node stream and write with a size limiter
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
    nodeStream
      .pipe(limiter)
      .pipe(out)
      .on("finish", resolve)
      .on("error", reject);
  });

  console.log("[upload] saved", { absolute, relative, size: total });
  return { relative, absolute };
}

/* ============================
 * GET /api/requests
 * List current user's requests (includes status)
 * ============================ */
export async function GET() {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const rows = await FundingRequest.find({ userId: me.sub })
      .sort({ createdAt: -1 })
      .select(
        "decFirstName decLastName insuranceCompany policyNumbers createdAt fhRep assignmentAmount status"
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
    }));

    return NextResponse.json({ requests });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ============================
 * POST /api/requests
 * Create a new request (multipart form-data)
 * - NEW users blocked
 * - streams assignmentUpload (optional) to disk (500MB max)
 * ============================ */
export async function POST(req: Request) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me.role === "NEW") {
      return NextResponse.json(
        { error: "Approval required before submitting." },
        { status: 403 }
      );
    }

    await connectDB();

    const ctype = req.headers.get("content-type") || "";
    console.log("[upload] content-type:", ctype);

    let body: any = {};
    let assignmentRelative: string | undefined;

    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();

      // File first (must be named 'assignmentUpload')
      const file = form.get("assignmentUpload");
      if (file && file instanceof File && file.size > 0) {
        const saved = await streamToFile(file);
        assignmentRelative = saved.relative; // store RELATIVE path
      }

      const text = (k: string) => (form.get(k) ? String(form.get(k)) : "");

      body = {
        // FH/CEM
        fhName: text("fhName"),
        fhRep: text("fhRep"),
        contactPhone: text("contactPhone"),
        contactEmail: text("contactEmail"),

        // Decedent
        decFirstName: text("decFirstName"),
        decLastName: text("decLastName"),
        decSSN: text("decSSN"),
        decMaritalStatus: text("decMaritalStatus"),
        decAddress: text("decAddress"),
        decCity: text("decCity"),
        decState: text("decState"),
        decZip: text("decZip"),

        // Place of death
        decPODCity: text("decPODCity"),
        decPODState: text("decPODState"),

        // Employer
        employerPhone: text("employerPhone"),
        employerContact: text("employerContact"),
        employmentStatus: text("employmentStatus"),

        // Insurance
        insuranceCompany: text("insuranceCompany"),
        policyNumbers: text("policyNumbers"),
        faceAmount: text("faceAmount"),
        beneficiaries: text("beneficiaries"),

        // Financials
        totalServiceAmount: text("totalServiceAmount"),
        familyAdvancementAmount: text("familyAdvancementAmount"),
        vipFee: text("vipFee"),
        assignmentAmount: text("assignmentAmount"),

        // Misc
        notes: text("notes"),
      };

      // Dates
      const dob = text("decDOB");
      const dod = text("decDOD");
      if (dob) body.decDOB = parseDate(dob);
      if (dod) body.decDOD = parseDate(dod);

      // Booleans
      body.deathInUS = toBool(form.get("deathInUS"));
      body.codNatural = toBool(form.get("codNatural"));
      body.codAccident = toBool(form.get("codAccident"));
      body.codHomicide = toBool(form.get("codHomicide"));
      body.codPending = toBool(form.get("codPending"));
      body.codSuicide = toBool(form.get("codSuicide"));
      body.hasFinalDC = toBool(form.get("hasFinalDC"));
      body.otherFHTakingAssignment = toBool(form.get("otherFHTakingAssignment"));

      // Other FH fields
      body.otherFHName = text("otherFHName");
      body.otherFHAmount = text("otherFHAmount");
    } else {
      // JSON fallback (no file)
      const json = await req.json().catch(() => ({}));
      body = json || {};
    }

    const doc = await FundingRequest.create({
      userId: me.sub,
      ...body,
      ...(assignmentRelative ? { assignmentUploadPath: assignmentRelative } : {}),
      // status defaults to "Submitted" in the model
    });

    console.log("[upload] created request", {
      id: String(doc._id),
      assignmentUploadPath: assignmentRelative,
    });

    return NextResponse.json({ ok: true, id: String(doc._id) }, { status: 201 });
  } catch (err: any) {
    console.error("[upload] error", err);
    const msg = typeof err?.message === "string" ? err.message : "Server error";
    const code = msg.includes("File too large") ? 413 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
