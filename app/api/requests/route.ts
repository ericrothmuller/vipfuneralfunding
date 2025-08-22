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

/* GET /api/requests — list current user's requests (supports ?q= search) */
export async function GET(req: Request) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    const find: any = { userId: me.sub };
    if (q) {
      const rx = { $regex: q, $options: "i" };
      find.$or = [
        { decFirstName: rx },
        { decLastName: rx },
        { policyNumbers: rx },
        { insuranceCompany: rx },               // legacy display string
        { "otherInsuranceCompany.name": rx },   // “Other” company name
      ];
    }

    const rows = await FundingRequest.find(find)
      .sort({ createdAt: -1 })
      .select(
        "decFirstName decLastName insuranceCompanyId otherInsuranceCompany insuranceCompany policyNumbers createdAt fhRep assignmentAmount status"
      )
      .populate({ path: "insuranceCompanyId", select: "name" })
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
      };
    });

    return NextResponse.json({ requests });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* POST /api/requests — unchanged from your latest version (streams upload, supports company id/other) */
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
      const file = form.get("assignmentUpload");
      if (file && file instanceof File && file.size > 0) {
        const saved = await streamToFile(file);
        assignmentRelative = saved.relative;
      }

      const text = (k: string) => (form.get(k) ? String(form.get(k)) : "");
      const bool = (k: string) => toBool(form.get(k));

      const insuranceCompanyMode = text("insuranceCompanyMode"); // "id" | "other" | ""
      const insuranceCompanyId = text("insuranceCompanyId"); // ObjectId
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

      body.deathInUS = bool("deathInUS");
      body.codNatural = bool("codNatural");
      body.codAccident = bool("codAccident");
      body.codHomicide = bool("codHomicide");
      body.codPending = bool("codPending");
      body.codSuicide = bool("codSuicide");
      body.hasFinalDC = bool("hasFinalDC");
      body.otherFHTakingAssignment = bool("otherFHTakingAssignment");

      body.otherFHName = text("otherFHName");
      body.otherFHAmount = text("otherFHAmount");

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
      const json = await req.json().catch(() => ({}));
      body = json || {};
    }

    let insuranceCompanyDisplay = "";
    if (body.insuranceCompanyId) insuranceCompanyDisplay = "";
    else if (body.otherInsuranceCompany?.name) insuranceCompanyDisplay = body.otherInsuranceCompany.name;
    if (insuranceCompanyDisplay) body.insuranceCompany = insuranceCompanyDisplay;

    const doc = await FundingRequest.create({
      userId: me.sub,
      ...body,
      ...(assignmentRelative ? { assignmentUploadPath: assignmentRelative } : {}),
    });

    console.log("[upload] created request", {
      id: String(doc._id),
      insuranceCompanyId: doc.insuranceCompanyId,
      otherIC: doc.otherInsuranceCompany,
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
