// app/api/requests/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { FundingRequest } from "@/models/FundingRequest";

import fs from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR    = process.env.UPLOAD_DIR || "/home/deploy/uploads/vipfuneralfunding";
const LEGACY_PARENT = "/home/deploy/uploads";

function within(root: string, p: string) {
  const rel = path.relative(root, p);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

// ---------- GET (detail) ----------
export async function GET(_req: Request, context: any) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await (context?.params ?? {});
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await connectDB();
    const doc: any = await FundingRequest.findById(id).lean();

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = String(doc.userId) === String(me.sub);
    const isAdmin = me.role === "ADMIN";
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // return full doc (id included)
    return NextResponse.json({ request: { id: String(doc._id), ...doc } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ---------- DELETE ----------
export async function DELETE(_req: Request, context: any) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await (context?.params ?? {});
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await connectDB();
    const doc: any = await FundingRequest.findById(id).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = String(doc.userId) === String(me.sub);
    const isAdmin = me.role === "ADMIN";

    // New rule: FH/CEM can delete only while status is Submitted
    if (!isAdmin) {
      if (me.role !== "FH_CEM") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if ((doc.status || "Submitted") !== "Submitted") {
        return NextResponse.json({ error: "Cannot delete once status is not Submitted" }, { status: 403 });
      }
      if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Best-effort file cleanup (unchanged from your version)
    const UPLOAD_DIR = process.env.UPLOAD_DIR || "/home/deploy/uploads/vipfuneralfunding";
    const LEGACY_PARENT = "/home/deploy/uploads";
    const path = (await import("node:path")).default;
    const fs = (await import("node:fs/promises")).default;

    const within = (root: string, p: string) => {
      const rel = path.relative(root, p);
      return !rel.startsWith("..") && !path.isAbsolute(rel);
    };

    const stored = (doc.assignmentUploadPath as string | undefined) || "";
    if (stored) {
      try {
        let rel = stored.trim().replace(/^[/\\]+/, "");
        if (rel.toLowerCase().startsWith("uploads/")) rel = rel.slice("uploads/".length);

        const root = path.resolve(UPLOAD_DIR);
        const legacy = path.resolve(LEGACY_PARENT);
        const candidates = [
          path.resolve(root, rel),
          path.resolve(root, path.basename(rel)),
          path.resolve(legacy, rel),
          path.resolve(legacy, path.basename(rel)),
        ];
        for (const p of candidates) {
          try {
            if (within(root, p) || within(legacy, p)) await fs.rm(p, { force: true });
          } catch {}
        }
      } catch (e) {
        console.warn("[delete] file cleanup error", e);
      }
    }

    await FundingRequest.deleteOne({ _id: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
