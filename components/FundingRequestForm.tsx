// components/FundingRequestForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/** ------------------- Types ------------------- */
type Profile = {
  fhName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

type IC = { id: string; name: string };

const COD_OPTIONS = ["Natural", "Accident", "Homicide", "Pending", "Suicide"] as const;

/** ------------------- Helpers ------------------- */
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
function parseMoneyNumber(s: string): number {
  const clean = String(s).replace(/[^0-9.]+/g, "");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}
function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

/** Free typing for currency fields; format on blur */
function handleCurrencyInput(
  value: string,
  setter: React.Dispatch<React.SetStateAction<string>>
) {
  const clean = value.replace(/[^0-9.]/g, "");
  const parts = clean.split(".");
  const normalized =
    parts.length <= 2
      ? clean
      : `${parts[0]}.${parts.slice(1).join("")}`.replace(/\./g, (m, i) => (i === 0 ? "." : ""));
  setter(normalized);
}
function handleCurrencyBlur(
  value: string,
  setter: React.Dispatch<React.SetStateAction<string>>
) {
  const n = parseMoneyNumber(value);
  setter(formatMoney(n));
}

/** ------------------- Component ------------------- */
export default function FundingRequestForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();

  /** Profile Preload (FH/CEM fields) */
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<Profile>({
    fhName: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
  });

  /** Insurance company list */
  const [companies, setCompanies] = useState<IC[]>([]);

  /** Funeral Home / Cemetery (autofilled) */
  const [fhName, setFhName] = useState("");
  const [fhRep, setFhRep] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  /** Decedent */
  const [decFirstName, setDecFirstName] = useState("");
  const [decLastName, setDecLastName] = useState("");
  const [decSSN, setDecSSN] = useState("");
  const [decDOB, setDecDOB] = useState("");
  const [decDOD, setDecDOD] = useState("");
  const [decMaritalStatus, setDecMaritalStatus] = useState("");

  /** Address */
  const [decAddress, setDecAddress] = useState("");
  const [decCity, setDecCity] = useState("");
  const [decState, setDecState] = useState("");
  const [decZip, setDecZip] = useState("");

  /** Place of death & Cause of death (required dropdown) */
  const [decPODCity, setDecPODCity] = useState("");
  const [decPODState, setDecPODState] = useState("");
  const [cod, setCod] = useState<string>("");

  /** Certificates & Assignment (required dropdowns, conditional fields) */
  const [hasFinalDC, setHasFinalDC] = useState<string>("");
  const [otherFHTakingAssignment, setOtherFHTakingAssignment] = useState<string>("");
  const [otherFHName, setOtherFHName] = useState("");
  const [otherFHAmount, setOtherFHAmount] = useState("");

  /** Employer section (required dropdown + conditional fields) */
  const [isEmployerInsurance, setIsEmployerInsurance] = useState<string>("");
  const [employerCompanyName, setEmployerCompanyName] = useState("");
  const [employerContact, setEmployerContact] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState<string>("");

  /** Insurance company selection (managed or Other) */
  const [insuranceCompanyMode, setInsuranceCompanyMode] = useState<"" | "id" | "other">("");
  const [insuranceCompanyId, setInsuranceCompanyId] = useState("");

  /** Policy Numbers (dynamic) */
  const [policyNumbers, setPolicyNumbers] = useState<string[]>([""]);
  const addPolicy = () => setPolicyNumbers((arr) => [...arr, ""]);
  const removePolicy = (idx: number) => setPolicyNumbers((arr) => arr.filter((_, i) => i !== idx));
  const updatePolicy = (idx: number, val: string) =>
    setPolicyNumbers((arr) => arr.map((v, i) => (i === idx ? val : v)));

  /** Beneficiaries (dynamic) */
  const [beneficiaries, setBeneficiaries] = useState<string[]>([""]);
  const addBeneficiary = () => setBeneficiaries((arr) => [...arr, ""]);
  const removeBeneficiary = (idx: number) => setBeneficiaries((arr) => arr.filter((_, i) => i !== idx));
  const updateBeneficiary = (idx: number, val: string) =>
    setBeneficiaries((arr) => arr.map((v, i) => (i === idx ? val : v)));

  /** Financials with auto-calc & VIP minimum $100 */
  const [totalServiceAmount, setTotalServiceAmount] = useState("");
  const [familyAdvancementAmount, setFamilyAdvancementAmount] = useState("");

  const baseSum = useMemo(
    () => parseMoneyNumber(totalServiceAmount) + parseMoneyNumber(familyAdvancementAmount),
    [totalServiceAmount, familyAdvancementAmount]
  );
  const vipFeeRaw = useMemo(() => +(baseSum * 0.03).toFixed(2), [baseSum]);
  const vipFeeCalc = useMemo(() => Math.max(vipFeeRaw, 100), [vipFeeRaw]); // mandatory $100 minimum
  const assignmentAmountCalc = useMemo(() => +(baseSum + vipFeeCalc).toFixed(2), [baseSum, vipFeeCalc]);

  /** Notes */
  const [notes, setNotes] = useState("");

  /** Face Amount (Insurance section) */
  const [faceAmount, setFaceAmount] = useState("");

  /** UI state */
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  /** Load profile + IC list */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Profile
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
            setContactPhone(prof.contactPhone ? formatPhone(prof.contactPhone) : "");
            setContactEmail(prof.contactEmail || "");
          }
        }
        // Insurance companies
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

  /** Derived booleans for conditional sections */
  const showOtherFH = otherFHTakingAssignment === "Yes";
  const showEmployer = isEmployerInsurance === "Yes";

  /** ------------------- Submit ------------------- */
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      // Enforce required dropdowns
      if (!cod) throw new Error("Cause of Death is required.");
      if (!hasFinalDC) throw new Error("Final Death Certificate selection is required.");
      if (!otherFHTakingAssignment) throw new Error("FH/CEM taking assignment selection is required.");
      if (!isEmployerInsurance) throw new Error("Employer insurance selection is required.");

      const form = e.currentTarget;
      const fd = new FormData(form);

      // Mode + multi-values
      fd.set("insuranceCompanyMode", insuranceCompanyMode);
      if (insuranceCompanyMode === "id") fd.set("insuranceCompanyId", insuranceCompanyId);
      else fd.set("insuranceCompanyId", "");

      // Policy numbers & beneficiaries as comma-separated
      fd.set(
        "policyNumbers",
        policyNumbers.map((s) => s.trim()).filter(Boolean).join(", ")
      );
      fd.set(
        "beneficiaries",
        beneficiaries.map((s) => s.trim()).filter(Boolean).join(", ")
      );

      // Calculated financials (VIP min $100 enforced already)
      fd.set("vipFee", formatMoney(vipFeeCalc));
      fd.set("assignmentAmount", formatMoney(assignmentAmountCalc));

      const res = await fetch("/api/requests", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Server error (code ${res.status})`);

      // Clear + redirect to Profile
      form.reset();
      try { window.localStorage.setItem("vipff.activeTab", "profile"); } catch {}
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

  /** ------------------- Render ------------------- */
  return (
    <form onSubmit={onSubmit} className="fr-form">
      {/* LOCAL SCOPED STYLES */}
      <style jsx>{`
        :root { --gold: #d6b16d; }

        /* Base (overridden by themes) */
        .fr-form {
          --title-color: #d6b16d;
          --card-bg: #101418;
          --border: #2a2f37;
          --field-bg: #141a1e;
          --muted: #98a1b3;
          font-size: 18px;
          line-height: 1.45;
          display: grid;
          gap: 16px;
        }

        /* Dark theme (align with profile page feel) */
        @media (prefers-color-scheme: dark) {
          .fr-form {
            --title-color: var(--gold);
            --card-bg: #0f1318;       /* card */
            --border: #2a2f37;
            --field-bg: #171d24;      /* inputs slightly lighter than card */
            --muted: #98a1b3;
          }
        }
        /* Light theme */
        @media (prefers-color-scheme: light) {
          .fr-form {
            --title-color: #000;       /* black titles on light */
            --card-bg: #ffffff;
            --border: #d0d5dd;
            --field-bg: #f2f4f6;       /* inputs slightly darker than white */
            --muted: #333;
          }
        }
        /* Optional explicit theme flags via body[data-theme] */
        :global(body[data-theme="dark"]) .fr-form {
          --title-color: var(--gold);
          --card-bg: #0f1318;
          --border: #2a2f37;
          --field-bg: #171d24;
          --muted: #98a1b3;
        }
        :global(body[data-theme="light"]) .fr-form {
          --title-color: #000;
          --card-bg: #ffffff;
          --border: #d0d5dd;
          --field-bg: #f2f4f6;
          --muted: #333;
        }

        .fr-page-title {
          text-align: center;
          color: var(--title-color);
          margin: 20px 0 12px;   /* extra space above title */
          font-weight: 800;
          font-size: 26px;
        }

        .fr-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 0;            /* squared */
          padding: 14px;
        }

        /* Keep legend for a11y but visually hide it */
        .fr-legend {
          position: absolute !important;
          height: 1px; width: 1px; overflow: hidden;
          clip: rect(1px,1px,1px,1px); white-space: nowrap;
        }
        .fr-section-title {
          color: var(--title-color);
          font-weight: 800;
          margin: 0 0 12px 0;
          font-size: 20px;
        }

        .fr-readonly {
          background: rgba(160, 160, 160, 0.14);
          color: inherit;
          opacity: 0.85;
          cursor: not-allowed;
        }

        .fr-grid-2 { display: grid; gap: 10px; grid-template-columns: 1fr 1fr; }
        .fr-grid-3 { display: grid; gap: 10px; grid-template-columns: repeat(3, minmax(220px, 1fr)); }
        .fr-grid-3-tight { display: grid; gap: 8px; grid-template-columns: repeat(3, minmax(220px, 1fr)); }

        .fr-inline-actions { display: flex; gap: 8px; align-items: center; }
        .fr-del { background: transparent; border: 1px solid var(--border); border-radius: 0; padding: 6px 10px; cursor: pointer; }
        .fr-del:hover { background: rgba(220, 80, 80, 0.12); border-color: rgba(220, 80, 80, 0.35); }

        .fr-muted { color: var(--muted); font-size: 0.95em; }
        .fr-gold { background: var(--gold); border: 1px solid var(--gold); color: #0a0d11; padding: 10px 14px; border-radius: 0; cursor: pointer; }
        .fr-gold:disabled { opacity: 0.6; cursor: not-allowed; }

        input[type="text"],
        input[type="email"],
        input[type="tel"],
        input[type="date"],
        input[type="file"],
        select,
        textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 0;            /* squared */
          background: var(--field-bg);
        }

        /* Mobile friendliness */
        @media (max-width: 900px) {
          .fr-grid-2, .fr-grid-3, .fr-grid-3-tight { grid-template-columns: 1fr; }
          .fr-form { font-size: 17px; }
        }
        @media (max-width: 600px) {
          .fr-form { font-size: 16px; }
        }
      `}</style>

      <h2 className="fr-page-title">Funding Request</h2>

      {/* FH / CEM */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Funeral Home / Cemetery</legend>
        <h3 className="fr-section-title">Funeral Home / Cemetery</h3>

        <label>FH/CEM Name
          <input
            name="fhName"
            type="text"
            className="fr-readonly"
            value={fhName}
            readOnly
          />
        </label>

        <div className="fr-grid-2">
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
        </div>

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

      {/* Decedent */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Decedent</legend>
        <h3 className="fr-section-title">Decedent</h3>

        <div className="fr-grid-2">
          <label>DEC First Name
            <input name="decFirstName" type="text" required value={decFirstName} onChange={(e) => setDecFirstName(e.target.value)} />
          </label>
          <label>DEC Last Name
            <input name="decLastName" type="text" required value={decLastName} onChange={(e) => setDecLastName(e.target.value)} />
          </label>
        </div>

        <div className="fr-grid-3-tight">
          <label>DEC Social Security Number
            <input name="decSSN" type="text" value={decSSN} onChange={(e) => setDecSSN(e.target.value)} placeholder="###-##-####" />
          </label>
          <label>DEC Date of Birth
            <input name="decDOB" type="date" value={decDOB} onChange={(e) => setDecDOB(e.target.value)} />
          </label>
          <label>DEC Date of Death
            <input name="decDOD" type="date" value={decDOD} onChange={(e) => setDecDOD(e.target.value)} />
          </label>
        </div>

        <label>DEC Marital Status
          <input name="decMaritalStatus" type="text" value={decMaritalStatus} onChange={(e) => setDecMaritalStatus(e.target.value)} />
        </label>
      </fieldset>

      {/* Address */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Address</legend>
        <h3 className="fr-section-title">Address</h3>

        <label>DEC Address
          <input name="decAddress" type="text" value={decAddress} onChange={(e) => setDecAddress(e.target.value)} />
        </label>
        <div className="fr-grid-3-tight">
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

      {/* Place of Death & Cause */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Place of Death & Cause</legend>
        <h3 className="fr-section-title">Place of Death & Cause</h3>

        <div className="fr-grid-2">
          <label>Place of Death City
            <input name="decPODCity" type="text" value={decPODCity} onChange={(e) => setDecPODCity(e.target.value)} />
          </label>
          <label>Place of Death State
            <input name="decPODState" type="text" value={decPODState} onChange={(e) => setDecPODState(e.target.value)} />
          </label>
        </div>

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

      {/* Certificates & Assignment */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Certificates & Assignment</legend>
        <h3 className="fr-section-title">Certificates & Assignment</h3>

        <div className="fr-grid-2">
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
        </div>

        {showOtherFH && (
          <div className="fr-grid-2" style={{ marginTop: 8 }}>
            <label>If Yes, FH/CEM Name:
              <input name="otherFHName" type="text" value={otherFHName} onChange={(e) => setOtherFHName(e.target.value)} />
            </label>
            <label>FH/CEM Amount
              <input
                name="otherFHAmount"
                type="text"
                inputMode="decimal"
                value={otherFHAmount}
                onChange={(e) => handleCurrencyInput(e.target.value, setOtherFHAmount)}
                onBlur={(e) => handleCurrencyBlur(e.target.value, setOtherFHAmount)}
                placeholder="$0.00"
                title="Enter a dollar amount"
              />
            </label>
          </div>
        )}
      </fieldset>

      {/* Employer */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Employer</legend>
        <h3 className="fr-section-title">Employer</h3>

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
          <div className="fr-grid-3-tight" style={{ marginTop: 8 }}>
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

      {/* Insurance */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Insurance</legend>
        <h3 className="fr-section-title">Insurance</h3>

        <label>Insurance Company
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
            <option value="other">Other (enter details on request as needed)</option>
          </select>
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
            <div key={idx} style={{ display: "grid", gap: 6, marginTop: 8 }}>
              <label>Policy Number
                <input
                  type="text"
                  value={v}
                  onChange={(e) => updatePolicy(idx + 1, e.target.value)}
                />
              </label>
              <div className="fr-inline-actions">
                <button type="button" className="fr-del" onClick={() => removePolicy(idx + 1)}>Remove Policy Number</button>
              </div>
            </div>
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
            onChange={(e) => handleCurrencyInput(e.target.value, setFaceAmount)}
            onBlur={(e) => handleCurrencyBlur(e.target.value, setFaceAmount)}
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
            <div key={idx} style={{ display: "grid", gap: 6, marginTop: 8 }}>
              <label>Beneficiary
                <input
                  type="text"
                  value={v}
                  onChange={(e) => updateBeneficiary(idx + 1, e.target.value)}
                />
              </label>
              <div className="fr-inline-actions">
                <button type="button" className="fr-del" onClick={() => removeBeneficiary(idx + 1)}>Remove Beneficiary</button>
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-ghost" onClick={addBeneficiary} style={{ marginTop: 8 }}>
            + Add Beneficiary
          </button>
        </div>
      </fieldset>

      {/* Financials */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Financials</legend>
        <h3 className="fr-section-title">Financials</h3>

        <div className="fr-grid-3">
          <label>Total Service Amount
            <input
              name="totalServiceAmount"
              type="text"
              inputMode="decimal"
              required
              value={totalServiceAmount}
              onChange={(e) => handleCurrencyInput(e.target.value, setTotalServiceAmount)}
              onBlur={(e) => handleCurrencyBlur(e.target.value, setTotalServiceAmount)}
              placeholder="$0.00"
            />
          </label>

          <label>Family Advancement Amount
            <input
              name="familyAdvancementAmount"
              type="text"
              inputMode="decimal"
              value={familyAdvancementAmount}
              onChange={(e) => handleCurrencyInput(e.target.value, setFamilyAdvancementAmount)}
              onBlur={(e) => handleCurrencyBlur(e.target.value, setFamilyAdvancementAmount)}
              placeholder="$0.00"
            />
          </label>

          <label>VIP Fee (3% or $100 min)
            <input
              name="vipFee"
              type="text"
              value={formatMoney(vipFeeCalc)}
              readOnly={!isAdmin}
              className={!isAdmin ? "fr-readonly" : undefined}
            />
          </label>

          <label>Total Assignment Amount
            <input
              name="assignmentAmount"
              type="text"
              value={formatMoney(assignmentAmountCalc)}
              readOnly={!isAdmin}
              className={!isAdmin ? "fr-readonly" : undefined}
            />
          </label>
        </div>

        <p className="fr-muted" style={{ marginTop: 6 }}>
          VIP fee is calculated as 3% of (Service + Advancement), with a minimum of $100. Total Assignment = Service + Advancement + VIP.
        </p>
      </fieldset>

      {/* Notes (wider) */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Additional Notes</legend>
        <h3 className="fr-section-title">Additional Notes</h3>

        <textarea
          name="notes"
          rows={6}
          style={{ width: "100%" }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </fieldset>

      {/* Upload */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Upload Assignment</legend>
        <h3 className="fr-section-title">Upload Assignment</h3>

        <input
          name="assignmentUpload"
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.tif,.tiff,.webp,.gif,.txt"
        />
        <p className="fr-muted" style={{ marginTop: 6 }}>
          Max 500MB. Accepted: PDF, DOC/DOCX, PNG/JPG, TIFF, WEBP, TXT.
        </p>
      </fieldset>

      <button disabled={saving} className="fr-gold" type="submit">
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
