// app/api/forms/assignment/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

type BenePayload = {
  name?: string;
  relation?: string;
  ssn?: string;
  dob?: string;     // MM/DD/YYYY expected
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
};

type Payload = {
  insuredFirstName?: string;
  insuredLastName?: string;
  dateOfDeath?: string;           // "MM/DD/YYYY"
  assignmentAmount?: string;      // "$#,###.##"
  fhName?: string;
  insuranceCompanyName?: string;
  policyNumbers?: string;         // "123, 456"
  fhRepName?: string;

  bene1?: BenePayload;
  bene2?: BenePayload;

  fileName?: string;              // optional: suggests Content-Disposition filename
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;

    // Load template from /public
    const tplPath = path.join(process.cwd(), "public", "Funding Request Assignment.pdf");
    const bytes = await readFile(tplPath);

    const pdf = await PDFDocument.load(bytes);
    const form = pdf.getForm();

    const set = (fieldName: string, value?: string | null) => {
      try {
        form.getTextField(fieldName).setText(value ?? "");
      } catch {
        // Field not present in the PDF — ignore silently
      }
    };

    // Compose mapped values
    const insuredDeceasedName = [body.insuredFirstName || "", body.insuredLastName || ""]
      .map(s => s.trim())
      .filter(Boolean)
      .join(" ");

    // === Core field mappings ===
    set("Insured Deceased Name", insuredDeceasedName);
    set("Date of Death", body.dateOfDeath || "");
    set("Assignment Amount", body.assignmentAmount || ""); // <— re-tried mapping
    set("Funeral Home or Cemetery Name", body.fhName || "");
    set("Insurance Company Name", body.insuranceCompanyName || "");
    set("Policy Numbers", body.policyNumbers || "");
    set("Name of Funeral Home or Cemetery", body.fhName || "");
    set("FH or CEM Rep Name", body.fhRepName || "");       // <— re-tried mapping

    // === Bene1 ===
    if (body.bene1) {
      set("Bene1 Name",     body.bene1.name || "");
      set("Bene1 Relation", body.bene1.relation || "");
      set("Bene1 SSN",      body.bene1.ssn || "");
      set("Bene1 DOB",      body.bene1.dob || "");
      set("Bene1 Phone",    body.bene1.phone || "");
      set("Bene1 Email",    body.bene1.email || "");
      set("Bene1 Address",  body.bene1.address || "");
      set("Bene1 City",     body.bene1.city || "");
      set("Bene1 State",    body.bene1.state || "");
      set("Bene1 Zip",      body.bene1.zip || "");
    }

    // === Bene2 ===
    if (body.bene2) {
      set("Bene2 Name",     body.bene2.name || "");
      set("Bene2 Relation", body.bene2.relation || "");
      set("Bene2 SSN",      body.bene2.ssn || "");
      set("Bene2 DOB",      body.bene2.dob || "");
      set("Bene2 Phone",    body.bene2.phone || "");
      set("Bene2 Email",    body.bene2.email || "");
      set("Bene2 Address",  body.bene2.address || "");
      set("Bene2 City",     body.bene2.city || "");
      set("Bene2 State",    body.bene2.state || "");
      set("Bene2 Zip",      body.bene2.zip || "");
    }

    form.flatten();

    // Save as base64 and return as a Buffer (clean typings)
    const base64 = await pdf.saveAsBase64({ dataUri: false });
    const buf = Buffer.from(base64, "base64");

    const fileName = (body.fileName && body.fileName.trim()) || "Assignment-Filled.pdf";

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[assignment form] error", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
