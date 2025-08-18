// app/api/requests/[id]/assignment/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { FundingRequest } from "@/models/FundingRequest";

import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/home/deploy/uploads/vipfuneralfunding";

/** Tiny extension → mime map. */
function guessContentType(p: string): string {
  const ext = path.extname(p).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain; charset=utf-8",
  };
  return map[ext] || "application/octet-stream";
}

export async function GET(_req: Request, context: any) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Backend gate for NEW users too
    if (me.role === "NEW") {
      return NextResponse.json(
        { error: "Approval required before accessing funding requests." },
        { status: 403 }
      );
    }

    // In Next 15, context.params might be async; this works for both cases.
    const { id } = await (context?.params ?? {});
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await connectDB();
    const doc: any = await FundingRequest.findById(id)
      .select("userId assignmentUploadPath")
      .lean();

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = String(doc.userId) === String(me.sub);
    const isAdmin = me.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stored = (doc.assignmentUploadPath as string | undefined) || "";
    if (!stored) {
      return NextResponse.json({ error: "No assignment uploaded" }, { status: 404 });
    }

    // ---- Resolve a safe absolute path inside UPLOAD_DIR ----
    // Supports either a relative like "2025/08/file.pdf" or an absolute saved earlier.
    const root = path.resolve(UPLOAD_DIR);
    const resolved = path.isAbsolute(stored)
      ? path.resolve(stored)
      : path.resolve(root, stored.replace(/^[/\\]+/, "")); // strip any accidental leading slash

    // Use path.relative to verify `resolved` is inside `root`
    const rel = path.relative(root, resolved);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      // Log details on the server for troubleshooting, but don't leak paths to the client
      console.warn("[assignment download] blocked path", { root, stored, resolved, rel });
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }
    // --------------------------------------------------------

    const stat = await fs.stat(resolved).catch(() => null);
    if (!stat || !stat.isFile()) {
      return NextResponse.json({ error: "File missing" }, { status: 404 });
    }

    const filename = path.basename(resolved);
    const type = guessContentType(resolved);

    // Stream the file; convert Node Readable to Web ReadableStream for Response
    const nodeStream = createReadStream(resolved);
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
