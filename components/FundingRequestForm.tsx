// components/FundingRequestForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/** --- Types --- */
type Profile = {
  fhName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

type IC = { id: string; name: string };

function onlyDigits(s: string) {
  return s.replace(/\D+/g, "");
}
function formatPhone(s: string) {
  const d = onlyDigits(s).slice(0, 10);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 10);
  if (d.length <= 3) return p1;
  if (d.length <= 6) return `(${p1}) ${p2}`;
  return `(${p1}) ${p2}-${p3}`;
}
function parseMoney(s: string): number {
  const c = String(s).replace(/[^0-9.]+/g, "");
  const n = Number(c);
  return isFinite(n) ? n : 0;
}
function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default function FundingRequestForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();

  /** --- Prefill state from profile --- */
  const [profile, setProfile] = useState<Profile>({
    fhName: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
  });
  const [loadingProfile, setLoadingProfile] = useState(true);

  /** --- Insurance Companies (managed list) --- */
  const [companies, setCompanies] = useState<IC[]>([]);

  /** --- Form sections state --- */

  // FH/CEM (prepopulated)
  const [fhName, setFhName] = useState<string>("");
  const [fhRep, setFhRep] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");

  // Decedent
  const [decFirstName, setDecFirstName] = useState("");
  const [decLastName, setDecLastName] = useState("");
  const [decSSN, setDecSSN] = useState("");
  const [decDOB, setDecDOB] = useState("");
  const [decDOD, setDecDOD] = useState("");
  const [decMaritalStatus, setDecMaritalStatus] = useState("");

  // Address
  const [decAddress, setDecAddress] = useState("");
  const [decCity, setDecCity] = useState("");
  const [decState, setDecState] = useState("");
  const [decZip, setDecZip] = useState("");

  // Place of death
  const [decPODCity, setDecPODCity] = useState("");
  const [decPODState, setDecPODState] = useState("");

  // Cause of death (required dropdown)
  const COD_OPTIONS = ["Natural", "Accident", "Homicide", "Pending", "Suicide"] as const;
  const [cod, setCod] = useState<string>(""); // blank initially

  // Certificates & Assignment
  const [hasFinalDC, setHasFinalDC] = useState<string>(""); // Yes/No (blank initially)
  const [otherFHTakingAssignment, setOtherFHTakingAssignment] = useState<string>(""); // Yes/No (blank initially)
  const [otherFHName, setOtherFHName] = useState<string>("");
  const [otherFHAmount, setOtherFHAmount] = useState<string>("");

  // Employer-based insurance
  const [isEmployerInsurance, setIsEmployerInsurance] = useState<string>(""); // Yes/No (blank initially)
  const [employerCompanyName, setEmployerCompanyName] = useState<string>("");
  const [employerContact, setEmployerContact] = useState<string>("");
  const [employmentStatus, setEmploymentStatus] = useState<string>(""); // Active/Retired/On Leave

  // Insurance company selection: managed list OR “Other” (from previous iteration)
  const [insuranceCompanyMode, setInsuranceCompanyMode] = useState<"" | "id" | "other">("");
  const [insuranceCompanyId, setInsuranceCompanyId] = useState<string>("");

  // Policy Numbers (dynamic list)
  const [policyNumbers, setPolicyNumbers] = useState<string[]>([""]);
  const addPolicy = () => setPolicyNumbers((arr) => [...arr, ""]);
  const updatePolicy = (idx: number, val: string) =>
    setPolicyNumbers((arr) => arr.map((v, i) => (i === idx ? val : v)));

  // Face amount etc.
  const [faceAmount, setFaceAmount] = useState<string>("");

  // Beneficiaries (dynamic list)
  const [beneficiaries, setBeneficiaries] = useState<string[]>([""]);
  const addBeneficiary = () => setBeneficiaries((arr) => [...arr, ""]);
  const updateBeneficiary = (idx: number, val: string) =>
    setBeneficiaries((arr) => arr.map((v, i) => (i === idx ? val : v)));

  // Financials
  const [totalServiceAmount, setTotalServiceAmount] = useState<string>("");
  const [familyAdvancementAmount, setFamilyAdvancementAmount] = useState<string>("");
  const serviceAdvancementSum = useMemo(
    () => parseMoney(totalServiceAmount) + parseMoney(familyAdvancementAmount),
    [totalServiceAmount, familyAdvancementAmount]
  );
  const vipFeeCalc = useMemo(() => +(serviceAdvancementSum * 0.03).toFixed(2), [serviceAdvancementSum]);
  const assignmentAmountCalc = useMemo(() => +(serviceAdvancementSum + vipFeeCalc).toFixed(2), [serviceAdvancementSum, vipFeeCalc]);

  // Misc
  const [notes, setNotes] = useState<string>("");

  // File upload
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Prefill from profile & load IC list
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // profile
        const p = await fetch("/api/profile", { cache: "no-store" });
        if (p.ok) {
          const { user } = await p.json();
          if (mounted && user) {
            const prof: Profile = {
              fhName: user.fhName || "",
              contactName: user.contactName || "",
              contactPhone: user.contactPhone || "",
              contactEmail: user.contactEmail || "",
            };
            setProfile(prof);
            setFhName(prof.fhName);
            setFhRep(prof.contactName || "");
            setContactPhone(formatPhone(prof.contactPhone || ""));
            setContactEmail(prof.contactEmail || "");
          }
        }
        // managed companies
        const c = await fetch("/api/insurance-companies", { cache: "no-store" });
        if (c.ok) {
          const data = await c.json();
          if (mounted) setCompanies(data?.items || []);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Submit
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget);

      // enforce required dropdowns by checking values before submit:
      if (!cod) throw new Error("Cause of Death is required.");
      if (!hasFinalDC) throw new Error("Final Death Certificate selection is required.");
      if (!otherFHTakingAssignment) throw new Error("FH/CEM taking assignment selection is required.");
      if (!isEmployerInsurance) throw new Error("Employer insurance selection is required.");

      // set mode + join multi-values
      fd.set("insuranceCompanyMode", insuranceCompanyMode);
      if (insuranceCompanyMode === "id") {
        fd.set("insuranceCompanyId", insuranceCompanyId);
      } else {
        fd.set("insuranceCompanyId", "");
      }
      // Policy Numbers → join into comma-separated string
      fd.set("policyNumbers", policyNumbers.map((s) => s.trim()).filter(Boolean).join(", "));
      // Beneficiaries → join into comma-separated string
      fd.set("beneficiaries", beneficiaries.map((s) => s.trim()).filter(Boolean).join(", "));

      // Inject calculated financials
      fd.set("vipFee", formatMoney(vipFeeCalc));
      fd.set("assignmentAmount", formatMoney(assignmentAmountCalc));

      const res = await fetch("/api/requests", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Server error (code ${res.status})`);

      // Clear form and go to Profile tab
      (e.target as HTMLFormElement).reset();
      try {
        window.localStorage.setItem("vipff.activeTab", "profile");
      } catch {}
      router.replace("/dashboard?tab=profile", { scroll: false });
      router.refresh();
      setTimeout(() => {
        if (!window.location.search.includes("tab=profile")) {
          window.location.assign("/dashboard?tab=profile");
        }
      }, 200);
    } catch (err: any) {
      setMsg(err?.message || "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  // Derived booleans
  const showOtherFH = otherFHTakingAssignment === "Yes";
  const showEmployer = isEmployerInsurance === "Yes";

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <h2>Funding Request</h2>

      {/* -------- FH / CEM (autopopulated) -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Funeral Home / Cemetery</legend>

        <label>FH/CEM Name
          <input
            name="fhName"
            type="text"
            value={fhName}
            readOnly
          />
        </label>

        <label>FH/CEM REP
          <input
            name="fhRep"
            type="text"
            value={fhRep}
            onChange={(e) => setFhRep(e.target.value)}
          />
        </label>

        <label>Contact Phone
          <input
            name="contactPhone"
            type="tel"
            required
            inputMode="numeric"
            pattern="\\(?\\d{3}\\)?[\\s-]?\\d{3}-?\\d{4}"
            value={contactPhone}
            onChange={(e) => setContactPhone(formatPhone(e.target.value))}
            placeholder="(555) 555-5555"
            title="Please enter a valid 10-digit phone number"
          />
        </label>

        <label>Contact Email
          <input
            name="contactEmail"
            type="email"
            required
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </label>
      </fieldset>

      {/* -------- Decedent -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Decedent</legend>

        <label>DEC First Name
          <input name="decFirstName" type="text" required value={decFirstName} onChange={(e) => setDecFirstName(e.target.value)} />
        </label>
        <label>DEC Last Name
          <input name="decLastName" type="text" required value={decLastName} onChange={(e) => setDecLastName(e.target.value)} />
        </label>
        <label>DEC Social Security Number
          <input name="decSSN" type="text" value={decSSN} onChange={(e) => setDecSSN(e.target.value)} placeholder="###-##-####" />
        </label>
        <label>DEC Date of Birth
          <input name="decDOB" type="date" value={decDOB} onChange={(e) => setDecDOB(e.target.value)} />
        </label>
        <label>DEC Date of Death
          <input name="decDOD" type="date" value={decDOD} onChange={(e) => setDecDOD(e.target.value)} />
        </label>
        <label>DEC Marital Status
          <input name="decMaritalStatus" type="text" value={decMaritalStatus} onChange={(e) => setDecMaritalStatus(e.target.value)} />
        </label>
      </fieldset>

      {/* -------- Address -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Address</legend>
        <label>DEC Address
          <input name="decAddress" type="text" value={decAddress} onChange={(e) => setDecAddress(e.target.value)} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px", gap: 8 }}>
          <label>City
            <input name="decCity" type="text" value={decCity} onChange={(e) => setDecCity(e.target.value)} />
          </label>
          <label>State
            <input name="decState" type="text" value={decState} onChange={(e) => setDecState(e.target.value)} />
          </label>
          <label>Zip Code
            <input name="decZip" type="text" value={decZip} onChange={(e) => setDecZip(e.target.value)} />
          </label>
        </div>
      </fieldset>

      {/* -------- Place of Death + Cause of Death -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Place of Death & Cause</legend>
        <label>Place of Death City
          <input name="decPODCity" type="text" value={decPODCity} onChange={(e) => setDecPODCity(e.target.value)} />
        </label>
        <label>Place of Death State
          <input name="decPODState" type="text" value={decPODState} onChange={(e) => setDecPODState(e.target.value)} />
        </label>

        <label>Cause of Death (required)
          <select
            name="codSingle"
            required
            value={cod}
            onChange={(e) => setCod(e.target.value)}
          >
            <option value="">— Select —</option>
            {COD_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
      </fieldset>

      {/* -------- Certificates & Assignment -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Certificates & Assignment</legend>

        <label>Do you have a final Death Certificate? (required)
          <select
            name="hasFinalDCSelect"
            required
            value={hasFinalDC}
            onChange={(e) => setHasFinalDC(e.target.value)}
          >
            <option value="">— Select —</option>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </label>

        <label>Is another FH/CEM taking an assignment? (required)
          <select
            name="otherFHTakingAssignmentSelect"
            required
            value={otherFHTakingAssignment}
            onChange={(e) => setOtherFHTakingAssignment(e.target.value)}
          >
            <option value="">— Select —</option>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </label>

        {showOtherFH && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 8, marginTop: 8 }}>
            <label>If Yes, FH/CEM Name:
              <input name="otherFHName" type="text" value={otherFHName} onChange={(e) => setOtherFHName(e.target.value)} />
            </label>
            <label>FH/CEM Amount
              <input
                name="otherFHAmount"
                type="text"
                inputMode="decimal"
                value={otherFHAmount}
                onChange={(e) => setOtherFHAmount(e.target.value)}
                placeholder="$0.00"
                title="Enter a dollar amount"
              />
            </label>
          </div>
        )}
      </fieldset>

      {/* -------- Employer -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Employer</legend>

        <label>Is the insurance through the deceased’s employer? (required)
          <select
            name="employerInsuranceSelect"
            required
            value={isEmployerInsurance}
            onChange={(e) => setIsEmployerInsurance(e.target.value)}
          >
            <option value="">— Select —</option>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </label>

        {showEmployer && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 220px", gap: 8, marginTop: 8 }}>
            <label>Employer Company Name
              <input name="employerCompanyName" type="text" value={employerCompanyName} onChange={(e) => setEmployerCompanyName(e.target.value)} />
            </label>
            <label>Employer Contact Name
              <input name="employerContact" type="text" value={employerContact} onChange={(e) => setEmployerContact(e.target.value)} />
            </label>
            <label>Active or Retired or On Leave?
              <select
                name="employmentStatus"
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
              >
                <option value="">— Select —</option>
                <option value="Active">Active</option>
                <option value="Retired">Retired</option>
                <option value="On Leave">On Leave</option>
              </select>
            </label>
          </div>
        )}
      </fieldset>

      {/* -------- Insurance -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Insurance</legend>

        <label>Insurance Company
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <select
              value={insuranceCompanyMode === "id" ? insuranceCompanyId : (insuranceCompanyMode === "other" ? "other" : "")}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "other") { setInsuranceCompanyMode("other"); setInsuranceCompanyId(""); }
                else if (v) { setInsuranceCompanyMode("id"); setInsuranceCompanyId(v); }
                else { setInsuranceCompanyMode(""); setInsuranceCompanyId(""); }
              }}
            >
              <option value="">— Select —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="other">Other (enter details below)</option>
            </select>
          </div>
        </label>

        {/* Policy Numbers dynamic */}
        <div style={{ marginTop: 8 }}>
          <label>Policy Number
            <input
              type="text"
              value={policyNumbers[0]}
              onChange={(e) => updatePolicy(0, e.target.value)}
            />
          </label>
          {policyNumbers.slice(1).map((v, idx) => (
            <label key={idx} style={{ display: "block", marginTop: 8 }}>
              Policy Number
              <input
                type="text"
                value={v}
                onChange={(e) => updatePolicy(idx + 1, e.target.value)}
              />
            </label>
          ))}
          <button type="button" className="btn btn-ghost" onClick={addPolicy} style={{ marginTop: 8 }}>
            + Add Policy Number
          </button>
        </div>

        <label style={{ marginTop: 8 }}>Face Amount
          <input
            name="faceAmount"
            type="text"
            inputMode="decimal"
            value={faceAmount}
            onChange={(e) => setFaceAmount(e.target.value)}
            placeholder="$0.00"
          />
        </label>

        {/* Beneficiaries dynamic */}
        <div style={{ marginTop: 8 }}>
          <label>Beneficiary
            <input
              type="text"
              value={beneficiaries[0]}
              onChange={(e) => updateBeneficiary(0, e.target.value)}
            />
          </label>
          {beneficiaries.slice(1).map((v, idx) => (
            <label key={idx} style={{ display: "block", marginTop: 8 }}>
              Beneficiary
              <input
                type="text"
                value={v}
                onChange={(e) => updateBeneficiary(idx + 1, e.target.value)}
              />
            </label>
          ))}
          <button type="button" className="btn btn-ghost" onClick={addBeneficiary} style={{ marginTop: 8 }}>
            + Add Beneficiary
          </button>
        </div>
      </fieldset>

      {/* -------- Financials -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Financials</legend>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", gap: 8 }}>
          <label>Total Service Amount
            <input
              name="totalServiceAmount"
              type="text"
              inputMode="decimal"
              value={totalServiceAmount}
              onChange={(e) => setTotalServiceAmount(e.target.value)}
              placeholder="$0.00"
              required
            />
          </label>

          <label>Family Advancement Amount
            <input
              name="familyAdvancementAmount"
              type="text"
              inputMode="decimal"
              value={familyAdvancementAmount}
              onChange={(e) => setFamilyAdvancementAmount(e.target.value)}
              placeholder="$0.00"
            />
          </label>

          <label>VIP Fee (3%)
            <input
              name="vipFee"
              type="text"
              value={formatMoney(vipFeeCalc)}
              readOnly={!isAdmin}
            />
          </label>

          <label>Total Assignment Amount
            <input
              name="assignmentAmount"
              type="text"
              value={formatMoney(assignmentAmountCalc)}
              readOnly={!isAdmin}
            />
          </label>
        </div>
      </fieldset>

      {/* -------- Notes (wider) -------- */}
      <fieldset className="card" style={{ padding: 12 }}>
        <legend className="panel-title">Additional Notes</legend>
        <textarea
          name="notes"
          rows={6}
          style={{ width: "100%" }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
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
          Max 500MB. Accepted: PDF, DOC/DOCX, PNG/JPG, TIFF, WEBP, TXT.
        </p>
      </fieldset>

      <button
        disabled={saving}
        className="btn"
        type="submit"
        style={{ background: "#d6b16d", borderColor: "#d6b16d" }}  // shade of gold
      >
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
