// app/api/requests/[id]/attachments/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { FundingRequest } from "@/models/FundingRequest";
import { User } from "@/models/User";

import path from "node:path";
import fs from "node:fs/promises";

const UPLOAD_DIR    = process.env.UPLOAD_DIR || "/home/deploy/uploads/vipfuneralfunding";
const LEGACY_PARENT = "/home/deploy/uploads";

/* -------------------- permission helpers -------------------- */
function isOwner(me: any, doc: any): boolean {
  const meId = String(me?.sub || "");
  return String(doc.ownerId || doc.userId) === meId;
}
async function fhcemExtraAllow(me: any, doc: any): Promise<boolean> {
  if (!me || me.role !== "FH_CEM") return false;
  const meUser: any = await User.findById(me.sub).select("fhCemId fhName").lean();
  if (!meUser) return false;

  if (meUser.fhCemId && doc?.fhCemId && String(meUser.fhCemId) === String(doc.fhCemId)) return true;

  const a = (meUser.fhName || "").trim().toLowerCase();
  const b = (doc?.fhName || "").trim().toLowerCase();
  return !!(a && b && a === b);
}
async function canDeleteAttachment(me: any, doc: any): Promise<boolean> {
  if (!me) return false;
  if (me.role === "ADMIN") return true;
  if (me.role === "NEW") return false;

  // FH/CEM: allow only while Submitted, and must be owner or FH/CEM-org match
  if (doc.status !== "Submitted") return false;
  if (isOwner(me, doc)) return true;
  return await fhcemExtraAllow(me, doc);
}

/* -------------------- path helpers -------------------- */
function insideAllowedRoots(p: string, roots: string[]): boolean {
  for (const r of roots) {
    const rel = path.relative(path.resolve(r), p);
    if (!rel.startsWith("..") && !path.isAbsolute(rel)) return true;
  }
  return false;
}

async function tryDeleteFileByRelative(relativeLike: string) {
  const root       = path.resolve(UPLOAD_DIR);
  const legacyRoot = path.resolve(LEGACY_PARENT);

  // normalize stored: strip leading slashes, drop optional "uploads/"
  let rel = String(relativeLike || "").trim().replace(/^[/\\]+/, "");
  if (rel.toLowerCase().startsWith("uploads/")) rel = rel.slice("uploads/".length);

  const candidates = [
    path.resolve(root, rel),
    path.resolve(root, path.basename(rel)),
    path.resolve(legacyRoot, rel),
    path.resolve(legacyRoot, path.basename(rel)),
  ];

  for (const abs of candidates) {
    if (!insideAllowedRoots(abs, [root, legacyRoot])) continue;
    try {
      const st = await fs.stat(abs).catch(() => null);
      if (st?.isFile()) {
        await fs.unlink(abs).catch(() => null);
        return true;
      }
    } catch { /* ignore */ }
  }
  return false;
}

/* -------------------- handler -------------------- */
export async function POST(req: Request, context: any) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const id: string | undefined = context?.params?.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Parse payload from form-data or json
    const ctype = req.headers.get("content-type") || "";
    let kind = "";
    let index = NaN;
    let action = "";

    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      action = String(form.get("action") || "");
      kind   = String(form.get("kind") || "");
      index  = Number(String(form.get("index") || ""));
    } else {
      const json = await req.json().catch(() => ({}));
      action = String(json?.action || "");
      kind   = String(json?.kind || "");
      index  = Number(String(json?.index || ""));
    }

    if (action !== "delete") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
    if (!["assignment", "other"].includes(kind)) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    if (!Number.isInteger(index) || index < 0) {
      return NextResponse.json({ error: "Invalid index" }, { status: 400 });
    }

    const doc: any = await FundingRequest.findById(id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!(await canDeleteAttachment(me, doc))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let deleted = false;

    if (kind === "assignment") {
      // Prefer array; fall back to legacy single
      if (Array.isArray(doc.assignmentUploadPaths) && doc.assignmentUploadPaths.length > index) {
        const rel = doc.assignmentUploadPaths[index];
        if (rel) {
          await tryDeleteFileByRelative(rel).catch(() => null);
          deleted = true;
        }
        // Remove from array
        doc.assignmentUploadPaths.splice(index, 1);
        // Maintain legacy single for backward compat if needed
        if (!doc.assignmentUploadPaths.length) {
          doc.assignmentUploadPaths = [];
          doc.assignmentUploadPath = ""; // clear legacy single if array now empty
        } else if (!doc.assignmentUploadPath) {
          doc.assignmentUploadPath = doc.assignmentUploadPaths[0];
        }
      } else if (doc.assignmentUploadPath && index === 0) {
        await tryDeleteFileByRelative(doc.assignmentUploadPath).catch(() => null);
        doc.assignmentUploadPath = "";
        deleted = true;
      } else {
        return NextResponse.json({ error: "Attachment index out of range" }, { status: 400 });
      }
    } else {
      // kind === "other"
      if (!Array.isArray(doc.otherUploadPaths) || index >= doc.otherUploadPaths.length) {
        return NextResponse.json({ error: "Attachment index out of range" }, { status: 400 });
      }
      const rel = doc.otherUploadPaths[index];
      if (rel) {
        await tryDeleteFileByRelative(rel).catch(() => null);
        deleted = true;
      }
      doc.otherUploadPaths.splice(index, 1);
    }

    await doc.save();

    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    console.error("[attachments delete] error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
