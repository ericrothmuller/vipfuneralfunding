// components/FundingRequestForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FundingRequestForm() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);

    try {
      const form = e.currentTarget;
      const data = new FormData(form);

      const res = await fetch("/api/requests", {
        method: "POST",
        body: data, // multipart with file
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Submit failed");

      setMsg("Submitted!");
      // go to list
      router.push("/requests");
    } catch (err: any) {
      setMsg(err?.message || "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <h2>Funding Request</h2>

      {/* FH/CEM */}
      <label>FH/CEM Name <input name="fhName" type="text" required style={{ width: "100%", padding: 8 }} /></label>
      <label>FH/CEM REP <input name="fhRep" type="text" style={{ width: "100%", padding: 8 }} /></label>
      <label>Contact Phone <input name="contactPhone" type="tel" style={{ width: "100%", padding: 8 }} /></label>
      <label>Contact Email <input name="contactEmail" type="email" style={{ width: "100%", padding: 8 }} /></label>

      {/* Decedent */}
      <label>DEC First Name <input name="decFirstName" type="text" required style={{ width: "100%", padding: 8 }} /></label>
      <label>DEC Last Name <input name="decLastName" type="text" required style={{ width: "100%", padding: 8 }} /></label>
      <label>DEC Social Security Number <input name="decSSN" type="text" style={{ width: "100%", padding: 8 }} placeholder="###-##-####" /></label>
      <label>DEC Date of Birth <input name="decDOB" type="date" style={{ width: "100%", padding: 8 }} /></label>
      <label>DEC Date of Death <input name="decDOD" type="date" style={{ width: "100%", padding: 8 }} /></label>
      <label>DEC Marital Status <input name="decMaritalStatus" type="text" style={{ width: "100%", padding: 8 }} /></label>

      {/* Address */}
      <label>DEC Address <input name="decAddress" type="text" style={{ width: "100%", padding: 8 }} /></label>
      <label>City <input name="decCity" type="text" style={{ width: "100%", padding: 8 }} /></label>
      <label>State <input name="decState" type="text" style={{ width: "100%", padding: 8 }} /></label>
      <label>Zip Code <input name="decZip" type="text" style={{ width: "100%", padding: 8 }} /></label>

      {/* Place of death */}
      <label>Place of Death City <input name="decPODCity" type="text" style={{ width: "100%", padding: 8 }} /></label>
      <label>Place of Death State <input name="decPODState" type="text" style={{ width: "100%", padding: 8 }} /></label>
      <label>
        Did the death occur in the United States?
        <input name="deathInUS" type="checkbox" defaultChecked />
      </label>

      {/* Cause of Death checkboxes */}
      <fieldset style={{ border: "1px solid #eee", padding: 8 }}>
        <legend>Cause of Death</legend>
        <label><input type="checkbox" name="codNatural" /> Natural</label>
        <label><input type="checkbox" name="codAccident" /> Accident</label>
        <label><input type="checkbox" name="codHomicide" /> Homicide</label>
        <label><input type="checkbox" name="codPending" /> Pending</label>
        <label><input type="checkbox" name="codSuicide" /> Suicide</label>
      </fieldset>

      {/* Certificates / assignment */}
      <label><input type="checkbox" name="hasFinalDC" /> Do you have a final Death Certificate?</label>
      <label><input type="checkbox" name="otherFHTakingAssignment" /> Is another FH/CEM taking an assignment?</label>
      <label>If Yes. FH/CEM Name: <input name="otherFHName" type="text" style={{ width: "100%", padding: 8 }} /></label>
      <label>Amount: <input name="otherFHAmount" type="text" style={{ width: "100%", padding: 8 }} /></label>

      {/* Employer */}
      <label>Employer Phone <input name="employerPhone" type="tel" style={{ width: "100%", padding: 8 }} /></label>
      <label>Employer Contact Name <input name="employerContact" type="text" style={{ width: "100%", padding: 8 }} /></label>
      <label>Active or Retired or On Leave? <input name="employmentStatus" type="text" style={{ width: "100%", padding: 8 }} /></label>

      {/* Insurance */}
      <label>Insurance Company <input name="insuranceCompany" type="text" style={{ width: "100%", padding: 8 }} /></label>
      <label>Policy Number(s) <input name="policyNumbers" type="text" style={{ width: "100%", padding: 8 }} /></label>
      <label>Face Amount <input name="faceAmount" type="text" style={{ width: "100%", padding: 8 }} /></label>
      <label>Beneficiaries <input name="beneficiaries" type="text" style={{ width: "100%", padding: 8 }} /></label>

      {/* Financials */}
      <label>Total Service Amount <input name="totalServiceAmount" type="text" style={{ width: "100%", padding: 8 }} /></label>
      <label>Family Advancement Amount <input name="familyAdvancementAmount" type="text" style={{ width: "100%", padding: 8 }} /></label>
      <label>VIP Fee <input name="vipFee" type="text" style={{ width: "100%", padding: 8 }} /></label>
      <label>Assignment Amount <input name="assignmentAmount" type="text" style={{ width: "100%", padding: 8 }} /></label>

      {/* Notes + upload */}
      <label>Additional Notes
        <textarea name="notes" rows={4} style={{ width: "100%", padding: 8 }} />
      </label>

      <label>Upload Assignment
        <input name="assignmentUpload" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
      </label>

      <button disabled={saving} type="submit" style={{ padding: 10 }}>
        {saving ? "Submitting…" : "Submit Funding Request"}
      </button>

      {msg && <p style={{ color: msg === "Submitted!" ? "green" : "crimson" }}>{msg}</p>}
    </form>
  );
}
