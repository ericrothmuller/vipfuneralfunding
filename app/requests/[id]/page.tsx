// app/requests/[id]/page.tsx
export const runtime = "nodejs";

import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getUserFromCookie } from "@/lib/auth";

async function fetchRequest(id: string) {
  // Forward the incoming request's cookie to your API so it can authenticate
  const h = await headers();
  const cookie = h.get("cookie") ?? "";

  const res = await fetch(`/api/requests/${id}`, {
    cache: "no-store",
    headers: { cookie },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.request || null;
}

function fmtBool(b: any) {
  return b ? "Yes" : "No";
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toLocaleDateString();
}

// NOTE: In React 19 / Next 15, `params` can be a Promise and must be awaited.
export default async function FundingRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getUserFromCookie();
  if (!me) redirect("/login");

  const { id } = await params; // await the params object
  const req = await fetchRequest(id);

  if (!req) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
        <p>Request not found.</p>
        <Link href="/requests">← Back to Funding Requests</Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <h1>Funding Request Details</h1>
      <p style={{ margin: "8px 0 20px" }}>
        <Link href="/requests">← Back to Funding Requests</Link>
      </p>

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Funeral Home / Cemetery</h3>
        <div>FH/CEM Name: <strong>{req.fhName}</strong></div>
        <div>FH/CEM REP: <strong>{req.fhRep}</strong></div>
        <div>Contact Phone: <strong>{req.contactPhone}</strong></div>
        <div>Contact Email: <strong>{req.contactEmail}</strong></div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Decedent</h3>
        <div>DEC Name: <strong>{[req.decFirstName, req.decLastName].filter(Boolean).join(" ")}</strong></div>
        <div>SSN: <strong>{req.decSSN}</strong></div>
        <div>Date of Birth: <strong>{fmtDate(req.decDOB)}</strong></div>
        <div>Date of Death: <strong>{fmtDate(req.decDOD)}</strong></div>
        <div>Marital Status: <strong>{req.decMaritalStatus}</strong></div>
        <div>Address: <strong>{req.decAddress}</strong></div>
        <div>City/State/Zip: <strong>{req.decCity}, {req.decState} {req.decZip}</strong></div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Place of Death</h3>
        <div>City: <strong>{req.decPODCity}</strong></div>
        <div>State: <strong>{req.decPODState}</strong></div>
        <div>In the United States?: <strong>{fmtBool(req.deathInUS)}</strong></div>
        <div>
          Cause of Death:{" "}
          <strong>
            {[
              req.codNatural && "Natural",
              req.codAccident && "Accident",
              req.codHomicide && "Homicide",
              req.codPending && "Pending",
              req.codSuicide && "Suicide",
            ]
              .filter(Boolean)
              .join(", ")}
          </strong>
        </div>
        <div>Final Death Certificate?: <strong>{fmtBool(req.hasFinalDC)}</strong></div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Assignments</h3>
        <div>Another FH/CEM taking assignment?: <strong>{fmtBool(req.otherFHTakingAssignment)}</strong></div>
        <div>If Yes, FH/CEM Name: <strong>{req.otherFHName}</strong></div>
        <div>Amount: <strong>{req.otherFHAmount}</strong></div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Employer</h3>
        <div>Employer Phone: <strong>{req.employerPhone}</strong></div>
        <div>Employer Contact Name: <strong>{req.employerContact}</strong></div>
        <div>Status (Active/Retired/On Leave): <strong>{req.employmentStatus}</strong></div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Insurance</h3>
        <div>Insurance Company: <strong>{req.insuranceCompany}</strong></div>
        <div>Policy Number(s): <strong>{req.policyNumbers}</strong></div>
        <div>Face Amount: <strong>{req.faceAmount}</strong></div>
        <div>Beneficiaries: <strong>{req.beneficiaries}</strong></div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Financials</h3>
        <div>Total Service Amount: <strong>{req.totalServiceAmount}</strong></div>
        <div>Family Advancement Amount: <strong>{req.familyAdvancementAmount}</strong></div>
        <div>VIP Fee: <strong>{req.vipFee}</strong></div>
        <div>Assignment Amount: <strong>{req.assignmentAmount}</strong></div>
      </section>

      <hr style={{ margin: "16px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3>Additional</h3>
        <div>Notes: <div style={{ whiteSpace: "pre-wrap" }}><strong>{req.notes}</strong></div></div>
        <div>
          Assignment Upload:{" "}
          {req.assignmentUploadPath ? (
            <span><code>{req.assignmentUploadPath}</code></span>
          ) : (
            <em>None</em>
          )}
        </div>
        <div>Created: <strong>{req.createdAt ? new Date(req.createdAt).toLocaleString() : ""}</strong></div>
        <div>Updated: <strong>{req.updatedAt ? new Date(req.updatedAt).toLocaleString() : ""}</strong></div>
      </section>
    </main>
  );
}
