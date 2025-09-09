// app/api/requests/[id]/other-docs/[index]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { FundingRequest } from "@/models/FundingRequest";

import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

const UPLOAD_DIR    = process.env.UPLOAD_DIR || "/home/deploy/uploads/vipfuneralfunding";
const LEGACY_PARENT = "/home/deploy/uploads";

function guessContentType(p: string): string {
  const ext = path.extname(p).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".tif": "image/tiff", ".tiff": "image/tiff",
    ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain; charset=utf-8",
  };
  return map[ext] || "application/octet-stream";
}

export async function GET(_req: Request, context: any) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = context?.params?.id as string | undefined;
    const indexStr = context?.params?.index as string | undefined;
    if (!id || !indexStr) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    const index = Number(indexStr);
    if (!Number.isInteger(index) || index < 0) return NextResponse.json({ error: "Invalid index" }, { status: 400 });

    await connectDB();

    const doc: any = await FundingRequest.findById(id).select("ownerId otherUploadPaths").lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = String(doc.ownerId) === String(me.sub) || String(doc.userId) === String(me.sub);
    const isAdmin = me.role === "ADMIN";
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const arr: string[] = Array.isArray(doc.otherUploadPaths) ? doc.otherUploadPaths : [];
    if (index >= arr.length) return NextResponse.json({ error: "File not found" }, { status: 404 });

    // Normalize stored path
    let relative = String(arr[index] || "").trim().replace(/^[/\\]+/, "");
    if (relative.toLowerCase().startsWith("uploads/")) relative = relative.slice("uploads/".length);

    const root = path.resolve(UPLOAD_DIR);
    const legacy = path.resolve(LEGACY_PARENT);
    const candidates = [
      path.resolve(root, relative),
      path.resolve(root, path.basename(relative)),
      path.resolve(legacy, relative),
      path.resolve(legacy, path.basename(relative)),
    ];

    const insideAllowed = (p: string) => {
      const rA = path.relative(root, p);
      const rL = path.relative(legacy, p);
      const inA = !rA.startsWith("..") && !path.isAbsolute(rA);
      const inL = !rL.startsWith("..") && !path.isAbsolute(rL);
      return inA || inL;
    };

    let chosen: string | null = null;
    for (const c of candidates) {
      if (!insideAllowed(c)) continue;
      const st = await fs.stat(c).catch(() => null);
      if (st?.isFile()) { chosen = c; break; }
    }

    if (!chosen) {
      console.warn("[other-docs] file not found in allowed roots", { relative, candidates });
      return NextResponse.json({ error: "File missing" }, { status: 404 });
    }

    const st = await fs.stat(chosen);
    const nodeStream = createReadStream(chosen);
    const webStream  = Readable.toWeb(nodeStream) as unknown as ReadableStream;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": guessContentType(chosen),
        "Content-Length": String(st.size),
        "Content-Disposition": `attachment; filename="${path.basename(chosen)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
