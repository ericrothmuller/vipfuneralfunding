// components/RequestDetailModal.tsx
"use client";

import { useEffect, useState } from "react";

type RequestDetail = {
  id: string;
  // Funeral Home / Cemetery
  fhName?: string;
  fhRep?: string;
  contactPhone?: string;
  contactEmail?: string;

  // Decedent
  decFirstName?: string;
  decLastName?: string;
  decSSN?: string;
  decDOB?: string | Date | null;
  decDOD?: string | Date | null;
  decMaritalStatus?: string;
  decAddress?: string;
  decCity?: string;
  decState?: string;
  decZip?: string;

  // Place of death
  decPODCity?: string;
  decPODState?: string;
  deathInUS?: boolean;

  // COD flags
  codNatural?: boolean;
  codAccident?: boolean;
  codHomicide?: boolean;
  codPending?: boolean;
  codSuicide?: boolean;

  hasFinalDC?: boolean;

  // Other FH assignment
  otherFHTakingAssignment?: boolean;
  otherFHName?: string;
  otherFHAmount?: string;

  // Employer
  employerPhone?: string;
  employerContact?: string;
  employmentStatus?: string;

  // Insurance
  insuranceCompany?: string;
  policyNumbers?: string;
  faceAmount?: string;
  beneficiaries?: string;

  // Financials
  totalServiceAmount?: string;
  familyAdvancementAmount?: string;
  vipFee?: string;
  assignmentAmount?: string;

  // Misc
  notes?: string;
  assignmentUploadPath?: string;

  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

function fmtBool(b: any) { return b ? "Yes" : "No"; }
function fmtDate(d?: string | Date | null) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toLocaleDateString();
}

export default function RequestDetailModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<RequestDetail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/requests/${id}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Failed to load request");
        if (mounted) setData(json.request);
      } catch (e: any) {
        setMsg(e?.message || "Could not load request");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
      <div className="modal">
        <div className="modal-header">
          <h3 id="request-modal-title">Funding Request Details</h3>
          <button className="btn btn-ghost modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {loading && <p>Loading…</p>}
          {msg && <p className="error">{msg}</p>}

          {data && !loading && !msg && (
            <div className="detail-grid">
              <section>
                <h4>Funeral Home / Cemetery</h4>
                <div><span>FH/CEM Name</span><strong>{data.fhName || ""}</strong></div>
                <div><span>FH/CEM REP</span><strong>{data.fhRep || ""}</strong></div>
                <div><span>Contact Phone</span><strong>{data.contactPhone || ""}</strong></div>
                <div><span>Contact Email</span><strong>{data.contactEmail || ""}</strong></div>
              </section>

              <section>
                <h4>Decedent</h4>
                <div><span>DEC Name</span><strong>{[data.decFirstName, data.decLastName].filter(Boolean).join(" ")}</strong></div>
                <div><span>SSN</span><strong>{data.decSSN || ""}</strong></div>
                <div><span>Date of Birth</span><strong>{fmtDate(data.decDOB)}</strong></div>
                <div><span>Date of Death</span><strong>{fmtDate(data.decDOD)}</strong></div>
                <div><span>Marital Status</span><strong>{data.decMaritalStatus || ""}</strong></div>
                <div><span>Address</span><strong>{data.decAddress || ""}</strong></div>
                <div><span>City/State/Zip</span><strong>{[data.decCity, data.decState, data.decZip].filter(Boolean).join(", ")}</strong></div>
              </section>

              <section>
                <h4>Place of Death</h4>
                <div><span>City</span><strong>{data.decPODCity || ""}</strong></div>
                <div><span>State</span><strong>{data.decPODState || ""}</strong></div>
                <div><span>In the United States?</span><strong>{fmtBool(data.deathInUS)}</strong></div>
                <div><span>Cause of Death</span>
                  <strong>
                    {[
                      data.codNatural && "Natural",
                      data.codAccident && "Accident",
                      data.codHomicide && "Homicide",
                      data.codPending && "Pending",
                      data.codSuicide && "Suicide",
                    ].filter(Boolean).join(", ")}
                  </strong>
                </div>
                <div><span>Final Death Certificate?</span><strong>{fmtBool(data.hasFinalDC)}</strong></div>
              </section>

              <section>
                <h4>Assignments</h4>
                <div><span>Another FH/CEM taking assignment?</span><strong>{fmtBool(data.otherFHTakingAssignment)}</strong></div>
                <div><span>If Yes, FH/CEM Name</span><strong>{data.otherFHName || ""}</strong></div>
                <div><span>Amount</span><strong>{data.otherFHAmount || ""}</strong></div>
              </section>

              <section>
                <h4>Employer</h4>
                <div><span>Employer Phone</span><strong>{data.employerPhone || ""}</strong></div>
                <div><span>Employer Contact</span><strong>{data.employerContact || ""}</strong></div>
                <div><span>Status</span><strong>{data.employmentStatus || ""}</strong></div>
              </section>

              <section>
                <h4>Insurance</h4>
                <div><span>Insurance Company</span><strong>{data.insuranceCompany || ""}</strong></div>
                <div><span>Policy Number(s)</span><strong>{data.policyNumbers || ""}</strong></div>
                <div><span>Face Amount</span><strong>{data.faceAmount || ""}</strong></div>
                <div><span>Beneficiaries</span><strong>{data.beneficiaries || ""}</strong></div>
              </section>

              <section>
                <h4>Financials</h4>
                <div><span>Total Service Amount</span><strong>{data.totalServiceAmount || ""}</strong></div>
                <div><span>Family Advancement Amount</span><strong>{data.familyAdvancementAmount || ""}</strong></div>
                <div><span>VIP Fee</span><strong>{data.vipFee || ""}</strong></div>
                <div><span>Assignment Amount</span><strong>{data.assignmentAmount || ""}</strong></div>
              </section>

              <section>
                <h4>Additional</h4>
                <div><span>Notes</span><div style={{ whiteSpace: "pre-wrap" }}><strong>{data.notes || ""}</strong></div></div>
                <div><span>Assignment Upload</span>
                  {data.assignmentUploadPath ? (
                    <a
                      className="btn"
                      href={`/api/requests/${id}/assignment`}
                      target="_blank"
                      rel="noopener"
                    >
                      Download Assignment
                    </a>
                  ) : (
                    <em>None</em>
                  )}
                </div>
                <div><span>Created</span><strong>{fmtDate(data.createdAt)}</strong></div>
                <div><span>Updated</span><strong>{fmtDate(data.updatedAt)}</strong></div>
              </section>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
