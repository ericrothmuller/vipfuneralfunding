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
      const fd = new FormData(e.currentTarget); // includes file + all fields
      const res = await fetch("/api/requests", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || `Server error (code ${res.status})`);
      }

      // Preselect the "requests" tab for the dashboard
      try { window.localStorage.setItem("vipff.activeTab", "requests"); } catch {}

      // ✅ Redirect to dashboard with a tab query so the tab picker sees it
      router.replace("/dashboard?tab=requests");
    } catch (err: any) {
      setMsg(err?.message || "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <h2>Funding Request</h2>

      {/* -------- FH / CEM -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Funeral Home / Cemetery</legend>
        <label>FH/CEM Name
          <input name="fhName" type="text" required style={{ width: "100%", padding: 8 }} />
        </label>
        <label>FH/CEM REP
          <input name="fhRep" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
        <label>Contact Phone
          <input name="contactPhone" type="tel" style={{ width: "100%", padding: 8 }} placeholder="(555) 555-5555" />
        </label>
        <label>Contact Email
          <input name="contactEmail" type="email" style={{ width: "100%", padding: 8 }} placeholder="name@example.com" />
        </label>
      </fieldset>

      {/* -------- Decedent -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Decedent</legend>
        <label>DEC First Name
          <input name="decFirstName" type="text" required style={{ width: "100%", padding: 8 }} />
        </label>
        <label>DEC Last Name
          <input name="decLastName" type="text" required style={{ width: "100%", padding: 8 }} />
        </label>
        <label>DEC Social Security Number
          <input name="decSSN" type="text" style={{ width: "100%", padding: 8 }} placeholder="###-##-####" />
        </label>
        <label>DEC Date of Birth
          <input name="decDOB" type="date" style={{ width: "100%", padding: 8 }} />
        </label>
        <label>DEC Date of Death
          <input name="decDOD" type="date" style={{ width: "100%", padding: 8 }} />
        </label>
        <label>DEC Marital Status
          <input name="decMaritalStatus" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
      </fieldset>

      {/* -------- Address -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Address</legend>
        <label>DEC Address
          <input name="decAddress" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px", gap: 8 }}>
          <label>City
            <input name="decCity" type="text" style={{ width: "100%", padding: 8 }} />
          </label>
          <label>State
            <input name="decState" type="text" style={{ width: "100%", padding: 8 }} />
          </label>
          <label>Zip Code
            <input name="decZip" type="text" style={{ width: "100%", padding: 8 }} />
          </label>
        </div>
      </fieldset>

      {/* -------- Place of Death -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Place of Death</legend>
        <label>Place of Death City
          <input name="decPODCity" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
        <label>Place of Death State
          <input name="decPODState" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input name="deathInUS" type="checkbox" defaultChecked />
          Did the death occur in the United States?
        </label>
      </fieldset>

      {/* -------- Cause of Death -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Cause of Death</legend>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(120px, 1fr))", gap: 8 }}>
          <label><input type="checkbox" name="codNatural" /> Natural</label>
          <label><input type="checkbox" name="codAccident" /> Accident</label>
          <label><input type="checkbox" name="codHomicide" /> Homicide</label>
          <label><input type="checkbox" name="codPending" /> Pending</label>
          <label><input type="checkbox" name="codSuicide" /> Suicide</label>
        </div>
      </fieldset>

      {/* -------- Certificates & Assignment -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Certificates & Assignment</legend>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="hasFinalDC" /> Do you have a final Death Certificate?
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="otherFHTakingAssignment" /> Is another FH/CEM taking an assignment?
        </label>
        <label>If Yes, FH/CEM Name:
          <input name="otherFHName" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
        <label>Amount:
          <input name="otherFHAmount" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
      </fieldset>

      {/* -------- Employer -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Employer</legend>
        <label>Employer Phone
          <input name="employerPhone" type="tel" style={{ width: "100%", padding: 8 }} />
        </label>
        <label>Employer Contact Name
          <input name="employerContact" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
        <label>Active or Retired or On Leave?
          <input name="employmentStatus" type="text" style={{ width: "100%", padding: 8 }} placeholder="Active / Retired / On Leave" />
        </label>
      </fieldset>

      {/* -------- Insurance -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Insurance</legend>
        <label>Insurance Company
          <input name="insuranceCompany" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
        <label>Policy Number(s)
          <input name="policyNumbers" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
        <label>Face Amount
          <input name="faceAmount" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
        <label>Beneficiaries
          <input name="beneficiaries" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
      </fieldset>

      {/* -------- Financials -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Financials</legend>
        <label>Total Service Amount
          <input name="totalServiceAmount" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
        <label>Family Advancement Amount
          <input name="familyAdvancementAmount" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
        <label>VIP Fee
          <input name="vipFee" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
        <label>Assignment Amount
          <input name="assignmentAmount" type="text" style={{ width: "100%", padding: 8 }} />
        </label>
      </fieldset>

      {/* -------- Notes -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Additional Notes</legend>
        <textarea name="notes" rows={4} style={{ width: "100%", padding: 8 }} />
      </fieldset>

      {/* -------- Upload -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Upload Assignment</legend>
        <input
          name="assignmentUpload"
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.tif,.tiff,.webp,.gif,.txt"
        />
        <p className="muted" style={{ marginTop: 6 }}>
          Max 25MB. Accepted: PDF, DOC/DOCX, PNG/JPG, TIFF, WEBP, TXT.
        </p>
      </fieldset>

      <button disabled={saving} className="btn" type="submit">
        {saving ? "Submitting…" : "Submit Funding Request"}
      </button>

      {msg && (
        <p role="alert" style={{ color: "crimson", marginTop: 8 }}>
          {msg}
        </p>
      )}
    </form>
  );
}
