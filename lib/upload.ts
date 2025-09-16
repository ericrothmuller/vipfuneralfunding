// lib/upload.ts
import { randomUUID } from "crypto";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/home/deploy/uploads/vipfuneralfunding";

export async function saveFileToUploads(file: File): Promise<string> {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const ext = path.extname((file as any).name || "") || guessExt(file.type) || "";
  const id = randomUUID();
  const relDir = path.join(yyyy, mm);
  const relPath = path.join(relDir, `${id}${ext}`);
  const absDir = path.resolve(UPLOAD_DIR, relDir);
  const absPath = path.resolve(UPLOAD_DIR, relPath);

  await fs.mkdir(absDir, { recursive: true });

  const readable = Readable.fromWeb(file.stream() as any);
  await new Promise<void>((resolve, reject) => {
    const ws = createWriteStream(absPath);
    readable.pipe(ws);
    ws.on("finish", () => resolve());
    ws.on("error", reject);
  });

  return relPath.replace(/\\/g, "/");
}

function guessExt(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/tiff": ".tif",
    "text/plain": ".txt",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  };
  return map[mime] || "";
}
