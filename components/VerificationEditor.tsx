// components/VerificationEditor.tsx
"use client";

import { useState } from "react";

type Prefill = {
  insuranceCompany: string;
  policyNumbers: string;
  insuredFirstName: string;
  insuredLastName: string;
  insuredSSN: string;
};

type Verification = {
  active?: boolean;
  inForce?: boolean;
  receivedAssignment?: boolean;
  primaryBeneficiaries?: string;
  contingentBeneficiaries?: string;
  acceptsThirdPartyAssignments?: boolean;
  otherAssignments?: boolean;
  claimAlreadyFiled?: boolean;
  assignmentSignedByBenes?: boolean;
  policyType?: string;
  issueDate?: string | null;
  reinstated?: boolean;
  contestable?: boolean;
  faceAmount?: string;
  loans?: string;
  totalBenefitAmount?: string;
  signingBenesPortionCoverAssignment?: boolean;
  documentsNeeded?: string;
  notes?: string;
};

export default function VerificationEditor({
  requestId,
  prefill,
  initial,
}: {
  requestId: string;
  prefill: Prefill;
  initial: Verification | null;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Verification>({
    active: initial?.active || false,
    inForce: initial?.inForce || false,
    receivedAssignment: initial?.receivedAssignment || false,
    primaryBeneficiaries: initial?.primaryBeneficiaries || "",
    contingentBeneficiaries: initial?.contingentBeneficiaries || "",
    acceptsThirdPartyAssignments: initial?.acceptsThirdPartyAssignments || false,
    otherAssignments: initial?.otherAssignments || false,
    claimAlreadyFiled: initial?.claimAlreadyFiled || false,
    assignmentSignedByBenes: initial?.assignmentSignedByBenes || false,
    policyType: initial?.policyType || "",
    issueDate: initial?.issueDate ? String(initial.issueDate).slice(0, 10) : "",
    reinstated: initial?.reinstated || false,
    contestable: initial?.contestable || false,
    faceAmount: initial?.faceAmount || "",
    loans: initial?.loans || "",
    totalBenefitAmount: initial?.totalBenefitAmount || "",
    signingBenesPortionCoverAssignment: initial?.signingBenesPortionCoverAssignment || false,
    documentsNeeded: initial?.documentsNeeded || "",
    notes: initial?.notes || "",
  });

  function set<K extends keyof Verification>(key: K, val: Verification[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/verification`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setMsg("Saved.");
    } catch (err: any) {
      setMsg(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-12">
      {/* Auto-populated, read-only header info */}
      <fieldset className="card p-12">
        <legend className="panel-title">Policy Snapshot</legend>
        <div className="grid cols-2 gap-12">
          <label>Insurance Company
            <input type="text" value={prefill.insuranceCompany} readOnly />
          </label>
          <label>Policy Number(s)
            <input type="text" value={prefill.policyNumbers} readOnly />
          </label>
          <label>Insured First Name
            <input type="text" value={prefill.insuredFirstName} readOnly />
          </label>
          <label>Insured Last Name
            <input type="text" value={prefill.insuredLastName} readOnly />
          </label>
          <label>Insured SSN
            <input type="text" value={prefill.insuredSSN} readOnly />
          </label>
        </div>
      </fieldset>

      {/* Answers */}
      <fieldset className="card p-12">
        <legend className="panel-title">Verification Details</legend>

        <div className="grid cols-3-tight gap-12">
          <label><input type="checkbox" checked={!!form.active} onChange={(e) => set("active", e.target.checked)} /> Active?</label>
          <label><input type="checkbox" checked={!!form.inForce} onChange={(e) => set("inForce", e.target.checked)} /> In Force?</label>
          <label><input type="checkbox" checked={!!form.receivedAssignment} onChange={(e) => set("receivedAssignment", e.target.checked)} /> Received Our Assignment?</label>

          <label>Primary Beneficiaries
            <input type="text" value={form.primaryBeneficiaries || ""} onChange={(e) => set("primaryBeneficiaries", e.target.value)} />
          </label>
          <label>Contingent Beneficiaries
            <input type="text" value={form.contingentBeneficiaries || ""} onChange={(e) => set("contingentBeneficiaries", e.target.value)} />
          </label>

          <label><input type="checkbox" checked={!!form.acceptsThirdPartyAssignments} onChange={(e) => set("acceptsThirdPartyAssignments", e.target.checked)} /> Accepts Funeral / Third-party Assignments?</label>
          <label><input type="checkbox" checked={!!form.otherAssignments} onChange={(e) => set("otherAssignments", e.target.checked)} /> Any Other Assignments?</label>
          <label><input type="checkbox" checked={!!form.claimAlreadyFiled} onChange={(e) => set("claimAlreadyFiled", e.target.checked)} /> Has Claim Already Been Filed?</label>
          <label><input type="checkbox" checked={!!form.assignmentSignedByBenes} onChange={(e) => set("assignmentSignedByBenes", e.target.checked)} /> Assignment Signed By The Beneficiaries?</label>

          <label>Type Of Policy?
            <input type="text" value={form.policyType || ""} onChange={(e) => set("policyType", e.target.value)} />
          </label>
          <label>Issue Date
            <input type="date" value={form.issueDate || ""} onChange={(e) => set("issueDate", e.target.value)} />
          </label>
          <label><input type="checkbox" checked={!!form.reinstated} onChange={(e) => set("reinstated", e.target.checked)} /> Reinstated?</label>
          <label><input type="checkbox" checked={!!form.contestable} onChange={(e) => set("contestable", e.target.checked)} /> Contestable?</label>

          <label>Face Amount
            <input type="text" value={form.faceAmount || ""} onChange={(e) => set("faceAmount", e.target.value)} />
          </label>
          <label>Loans
            <input type="text" value={form.loans || ""} onChange={(e) => set("loans", e.target.value)} />
          </label>
          <label>Total Benefit Amount?
            <input type="text" value={form.totalBenefitAmount || ""} onChange={(e) => set("totalBenefitAmount", e.target.value)} />
          </label>
          <label><input type="checkbox" checked={!!form.signingBenesPortionCoverAssignment} onChange={(e) => set("signingBenesPortionCoverAssignment", e.target.checked)} /> Signing Benes Portion Cover Assignment?</label>

          <label className="mt-12">Documents Needed To Pay Claim
            <input type="text" value={form.documentsNeeded || ""} onChange={(e) => set("documentsNeeded", e.target.value)} placeholder="e.g., Assignment, CF, DC" />
          </label>
        </div>

        <label className="mt-12">Notes
          <textarea rows={4} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} />
        </label>
      </fieldset>

      <div className="row-inline items-center">
        <button className="btn" disabled={saving} type="submit">{saving ? "Saving…" : "Save Verification"}</button>
        {msg && <span className={msg === "Saved." ? "muted" : "error"}>{msg}</span>}
      </div>
    </form>
  );
}
