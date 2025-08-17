// app/requests/[id]/page.tsx
export const runtime = "nodejs";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserFromCookie } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { FundingRequest } from "@/models/FundingRequest";

function fmtBool(b: any) {
  return b ? "Yes" : "No";
}
function fmtDate(d?: string | Date | null) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toLocaleDateString();
}

// In React 19 / Next 15, params is a Promise and must be awaited.
export default async function FundingRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getUserFromCookie();
  if (!me) redirect("/login");

  const { id } = await params;

  await connectDB();
  const doc: any = await FundingRequest.findById(id).lean();

  if (!doc) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
        <p>Request not found.</p>
        <Link href="/requests">← Back to Funding Requests</Link>
      </main>
    );
  }
  if (String(doc.userId) !== String(me.sub)) {
    redirect("/requests"); // or show 403 message
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <h1>Funding Request Details</h1>
      <p style={{ margin: "8px 0 20px" }}>
        <Link href="/requests">← Back to Funding Requests</Link>
      </p>

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Funeral Home / Cemetery</h3>
        <div>FH/CEM Name: <strong>{doc.fhName}</strong></div>
        <div>FH/CEM REP: <strong>{doc.fhRep}</strong></div>
        <div>Contact Phone: <strong>{doc.contactPhone}</strong></div>
        <div>Contact Email: <strong>{doc.contactEmail}</strong></div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Decedent</h3>
        <div>DEC Name: <strong>{[doc.decFirstName, doc.decLastName].filter(Boolean).join(" ")}</strong></div>
        <div>SSN: <strong>{doc.decSSN}</strong></div>
        <div>Date of Birth: <strong>{fmtDate(doc.decDOB)}</strong></div>
        <div>Date of Death: <strong>{fmtDate(doc.decDOD)}</strong></div>
        <div>Marital Status: <strong>{doc.decMaritalStatus}</strong></div>
        <div>Address: <strong>{doc.decAddress}</strong></div>
        <div>City/State/Zip: <strong>{doc.decCity}, {doc.decState} {doc.decZip}</strong></div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Place of Death</h3>
        <div>City: <strong>{doc.decPODCity}</strong></div>
        <div>State: <strong>{doc.decPODState}</strong></div>
        <div>In the United States?: <strong>{fmtBool(doc.deathInUS)}</strong></div>
        <div>
          Cause of Death:{" "}
          <strong>
            {[
              doc.codNatural && "Natural",
              doc.codAccident && "Accident",
              doc.codHomicide && "Homicide",
              doc.codPending && "Pending",
              doc.codSuicide && "Suicide",
            ]
              .filter(Boolean)
              .join(", ")}
          </strong>
        </div>
        <div>Final Death Certificate?: <strong>{fmtBool(doc.hasFinalDC)}</strong></div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Assignments</h3>
        <div>Another FH/CEM taking assignment?: <strong>{fmtBool(doc.otherFHTakingAssignment)}</strong></div>
        <div>If Yes, FH/CEM Name: <strong>{doc.otherFHName}</strong></div>
        <div>Amount: <strong>{doc.otherFHAmount}</strong></div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Employer</h3>
        <div>Employer Phone: <strong>{doc.employerPhone}</strong></div>
        <div>Employer Contact Name: <strong>{doc.employerContact}</strong></div>
        <div>Status (Active/Retired/On Leave): <strong>{doc.employmentStatus}</strong></div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Insurance</h3>
        <div>Insurance Company: <strong>{doc.insuranceCompany}</strong></div>
        <div>Policy Number(s): <strong>{doc.policyNumbers}</strong></div>
        <div>Face Amount: <strong>{doc.faceAmount}</strong></div>
        <div>Beneficiaries: <strong>{doc.beneficiaries}</strong></div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Financials</h3>
        <div>Total Service Amount: <strong>{doc.totalServiceAmount}</strong></div>
        <div>Family Advancement Amount: <strong>{doc.familyAdvancementAmount}</strong></div>
        <div>VIP Fee: <strong>{doc.vipFee}</strong></div>
        <div>Assignment Amount: <strong>{doc.assignmentAmount}</strong></div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Additional</h3>
        <div>Notes: <div style={{ whiteSpace: "pre-wrap" }}><strong>{doc.notes}</strong></div></div>
        <div>
          Assignment Upload:{" "}
          {doc.assignmentUploadPath ? (
            <span><code>{doc.assignmentUploadPath}</code></span>
          ) : (
            <em>None</em>
          )}
        </div>
        <div>Created: <strong>{doc.createdAt ? new Date(doc.createdAt).toLocaleString() : ""}</strong></div>
        <div>Updated: <strong>{doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : ""}</strong></div>
      </section>
    </main>
  );
}
