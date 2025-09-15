// app/api/forms/assignment/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

type Payload = {
  insuredFirstName?: string;
  insuredLastName?: string;
  dateOfDeath?: string;           // "MM/DD/YYYY"
  assignmentAmount?: string;      // "$#,###.##"
  fhName?: string;
  insuranceCompanyName?: string;
  policyNumbers?: string;         // "123, 456"
  fhRepName?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;

    // Load template PDF from /public
    // NOTE: In Next.js, /public files are served from root at runtime.
    // On server, we read them from the filesystem:
    const tplPath = path.join(process.cwd(), "public", "Funding Request Assignment.pdf");
    const bytes = await readFile(tplPath);

    const pdf = await PDFDocument.load(bytes);
    const form = pdf.getForm();

    // Helper to set a text field if present
    const set = (name: string, val?: string | null) => {
      try {
        const f = form.getTextField(name);
        f.setText(val ?? "");
      } catch {
        // Field not found in the PDF - ignore
      }
    };

    // Compose mapped values
    const insuredDeceasedName = [body.insuredFirstName || "", body.insuredLastName || ""]
      .map(s => s.trim())
      .filter(Boolean)
      .join(" ");

    // === Field mappings (as requested) ===
    set("Insured Deceased Name", insuredDeceasedName);
    set("Date of Death", body.dateOfDeath || "");
    set("Assignment Amount", body.assignmentAmount || "");
    set("Funeral Home or Cemetery Name", body.fhName || "");
    set("Insurance Company Name", body.insuranceCompanyName || "");
    set("Policy Numbers", body.policyNumbers || "");
    set("Name of Funeral Home or Cemetery", body.fhName || "");
    set("FH or CEM Rep Name", body.fhRepName || "");

    // (Bene fields intentionally not mapped yet per request.)
    // set("Bene1 Name", ...)
    // set("Bene2 Name", ...) etc.

    // Flatten to make fields non-editable in the output
    form.flatten();

    const out = await pdf.save();
    return new Response(out, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Assignment-Filled.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[assignment form] error", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
