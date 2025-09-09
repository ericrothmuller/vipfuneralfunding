// components/FundingRequestForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** ------------------- Types ------------------- */
type Profile = {
  fhName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

// include verificationTime for selected display
type IC = { id: string; name: string; verificationTime?: string };

const COD_OPTIONS = ["Natural", "Accident", "Homicide", "Pending", "Suicide"] as const;

/** v-flag-safe US phone pattern */
const PHONE_PATTERN_VSAFE = String.raw`[(]?\d{3}[)]?[\s-]?\d{3}-?\d{4}`;

/** ------------------- Helpers ------------------- */
function onlyDigits(s: string) { return s.replace(/\D+/g, ""); }
function formatPhone(s: string) {
  const d = onlyDigits(s).slice(0, 10);
  const p1 = d.slice(0, 3), p2 = d.slice(3, 6), p3 = d.slice(6, 10);
  if (d.length <= 3) return p1;
  if (d.length <= 6) return `(${p1}) ${p2}`;
  return `(${p1}) ${p2}-${p3}`;
}
function parseMoneyNumber(s: string): number {
  const n = Number(String(s).replace(/[^0-9.]+/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

type Setter = (next: string) => void;
function handleCurrencyInput(value: string, setter: Setter) {
  const clean = value.replace(/[^0-9.]/g, "");
  const parts = clean.split(".");
  const normalized = parts.length <= 2 ? clean : `${parts[0]}.${parts.slice(1).join("")}`.replace(/\./g, (m, i) => (i === 0 ? "." : ""));
  setter(normalized);
}
function handleCurrencyBlur(value: string, setter: Setter) {
  setter(formatMoney(parseMoneyNumber(value)));
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

  /** Insurance companies (for suggestions) */
  const [companies, setCompanies] = useState<IC[]>([]);

  /** FH/CEM (autofilled) */
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

  /** POD & COD */
  const [decPODCity, setDecPODCity] = useState("");
  const [decPODState, setDecPODState] = useState("");
  const [cod, setCod] = useState<string>("");

  /** Certificates & Assignment */
  const [hasFinalDC, setHasFinalDC] = useState<string>("");
  const [otherFHTakingAssignment, setOtherFHTakingAssignment] = useState<string>("");
  const [otherFHName, setOtherFHName] = useState("");
  const [otherFHAmount, setOtherFHAmount] = useState("");

  /** Employer */
  const [isEmployerInsurance, setIsEmployerInsurance] = useState<string>("");
  const [employerCompanyName, setEmployerCompanyName] = useState("");
  const [employerContact, setEmployerContact] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState<string>("");

  /** Insurance company typeahead state */
  const [icInput, setIcInput] = useState("");
  const [icOpen, setIcOpen] = useState(false);
  const [selectedIC, setSelectedIC] = useState<IC | null>(null);
  const icBoxRef = useRef<HTMLDivElement | null>(null);

  /** Policy Numbers (dynamic) */
  const [policyNumbers, setPolicyNumbers] = useState<string[]>([""]);
  const addPolicy = () => setPolicyNumbers((arr) => [...arr, ""]);
  const removePolicy = (idx: number) => setPolicyNumbers((arr) => arr.filter((_, i) => i !== idx));
  const updatePolicy = (idx: number, val: string) => setPolicyNumbers((arr) => arr.map((v, i) => (i === idx ? val : v)));

  /** Beneficiaries (dynamic) */
  const [beneficiaries, setBeneficiaries] = useState<string[]>([""]);
  const addBeneficiary = () => setBeneficiaries((arr) => [...arr, ""]);
  const removeBeneficiary = (idx: number) => setBeneficiaries((arr) => arr.filter((_, i) => i !== idx));
  const updateBeneficiary = (idx: number, val: string) => setBeneficiaries((arr) => arr.map((v, i) => (i === idx ? val : v)));

  /** Financials */
  const [totalServiceAmount, setTotalServiceAmount] = useState("");
  const [familyAdvancementAmount, setFamilyAdvancementAmount] = useState("");
  const baseSum = useMemo(
    () => parseMoneyNumber(totalServiceAmount) + parseMoneyNumber(familyAdvancementAmount),
    [totalServiceAmount, familyAdvancementAmount]
  );
  const vipFeeRaw = useMemo(() => +(baseSum * 0.03).toFixed(2), [baseSum]);
  const vipFeeCalc = useMemo(() => Math.max(vipFeeRaw, 100), [vipFeeRaw]);
  const assignmentAmountCalc = useMemo(() => +(baseSum + vipFeeCalc).toFixed(2), [baseSum, vipFeeCalc]);

  /** Notes + Face Amount */
  const [notes, setNotes] = useState("");
  const [faceAmount, setFaceAmount] = useState("");

  /** UI state */
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  /** Load profile + ICs */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
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
        const c = await fetch("/api/insurance-companies", { cache: "no-store" });
        if (c.ok) {
          const data = await c.json();
          if (mounted) setCompanies((data?.items || []) as IC[]);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /** Suggestions */
  const icMatches = useMemo(() => {
    const q = icInput.trim().toLowerCase();
    if (!q) return [];
    return companies.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [icInput, companies]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!icBoxRef.current) return;
      if (!icBoxRef.current.contains(e.target as Node)) setIcOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const showOtherFH = otherFHTakingAssignment === "Yes";
  const showEmployer = isEmployerInsurance === "Yes";

  /** ------------------- Submit ------------------- */
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      if (!cod) throw new Error("Cause of Death is required.");
      if (!hasFinalDC) throw new Error("Final Death Certificate selection is required.");
      if (!otherFHTakingAssignment) throw new Error("FH/CEM taking assignment selection is required.");
      if (!isEmployerInsurance) throw new Error("Employer insurance selection is required.");

      const form = e.currentTarget;
      const fd = new FormData(form);

      // Insurance mapping: ID if selected, otherwise free text as otherIC_name
      if (selectedIC) {
        fd.set("insuranceCompanyMode", "id");
        fd.set("insuranceCompanyId", selectedIC.id);
        fd.set("otherIC_name", "");
      } else {
        const typed = icInput.trim();
        fd.set("insuranceCompanyMode", typed ? "other" : "");
        fd.set("insuranceCompanyId", "");
        if (typed) fd.set("otherIC_name", typed);
      }

      // dynamic lists
      fd.set("policyNumbers", policyNumbers.map((s) => s.trim()).filter(Boolean).join(", "));
      fd.set("beneficiaries", beneficiaries.map((s) => s.trim()).filter(Boolean).join(", "));

      // computed currency
      fd.set("vipFee", formatMoney(vipFeeCalc));
      fd.set("assignmentAmount", formatMoney(assignmentAmountCalc));

      const res = await fetch("/api/requests", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Server error (code ${res.status})`);

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
      <style jsx>{`
        :root { --gold: #d6b16d; }

        .fr-form {
          --title-color: #d6b16d; --card-bg: #0b0d0f; --border: #1a1c1f; --field-bg: #121416; --muted: #e0e0e0;
          font-size: 18px; line-height: 1.45; display: grid; gap: 16px;
        }
        @media (prefers-color-scheme: light) {
          .fr-form { --title-color:#000; --card-bg:#fff; --border:#d0d5dd; --field-bg:#f2f4f6; --muted:#333; }
        }

        .fr-page-title { text-align:center; color:var(--title-color); margin:20px 0 12px; font-weight:800; font-size:26px; }
        .fr-card { background:var(--card-bg); border:1px solid var(--border); border-radius:0; padding:14px; }
        .fr-legend { position:absolute !important; height:1px; width:1px; overflow:hidden; clip:rect(1px,1px,1px,1px); white-space:nowrap; }
        .fr-section-title { color:var(--title-color); font-weight:800; margin:0 0 12px 0; font-size:20px; }
        .fr-readonly { background:rgba(255,255,255,.08); color:inherit; opacity:.9; cursor:not-allowed; }

        .fr-grid-2 { display:grid; gap:10px; grid-template-columns:1fr 1fr; }
        .fr-grid-3 { display:grid; gap:10px; grid-template-columns:repeat(3, minmax(220px, 1fr)); }
        .fr-grid-3-tight { display:grid; gap:8px; grid-template-columns:repeat(3, minmax(220px, 1fr)); }

        .fr-inline-actions { display:flex; gap:8px; align-items:center; }
        .fr-del { background:transparent; border:1px solid var(--border); border-radius:0; padding:6px 10px; cursor:pointer; color:var(--muted); }
        .fr-del:hover { background:rgba(255,255,255,.06); border-color:rgba(255,255,255,.25); }

        .fr-muted { color:var(--muted); font-size:.95em; }
        .fr-gold { background:var(--gold); border:1px solid var(--gold); color:#0a0d11; padding:10px 14px; border-radius:0; cursor:pointer; }
        .fr-gold:disabled { opacity:.6; cursor:not-allowed; }

        input[type="text"], input[type="email"], input[type="tel"], input[type="date"], input[type="file"], select, textarea {
          width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:0; background:var(--field-bg); color:#fff;
        }
        @media (prefers-color-scheme: light) {
          input[type="text"], input[type="email"], input[type="tel"], input[type="date"], input[type="file"], select, textarea { color:#000; }
        }

        @media (max-width:900px) { .fr-grid-2, .fr-grid-3, .fr-grid-3-tight { grid-template-columns:1fr; } .fr-form { font-size:17px; } }
        @media (max-width:600px) { .fr-form { font-size:16px; } }

        /* Typeahead styles */
        .ic-box { position: relative; }
        .ic-list {
          position: absolute; z-index: 30; top: calc(100% + 4px); left: 0; right: 0;
          background: var(--card-bg); border: 1px solid var(--border); border-radius: 0; max-height: 240px; overflow: auto;
        }
        .ic-item { padding: 8px 10px; cursor: pointer; }
        .ic-item:hover { background: rgba(255,255,255,.06); }
      `}</style>

      <h2 className="fr-page-title">Funding Request</h2>

      {/* FH / CEM */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Funeral Home / Cemetery</legend>
        <h3 className="fr-section-title">Funeral Home / Cemetery</h3>

        <label>FH/CEM Name
          <input name="fhName" type="text" className="fr-readonly" value={fhName} readOnly />
        </label>

        <div className="fr-grid-2">
          <label>FH/CEM REP
            <input name="fhRep" type="text" value={fhRep} onChange={(e) => setFhRep(e.target.value)} />
          </label>

          <label>Contact Phone
            <input
              name="contactPhone"
              type="tel"
              required
              inputMode="numeric"
              pattern={PHONE_PATTERN_VSAFE}
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
          <select name="codSingle" required value={cod} onChange={(e) => setCod(e.target.value)}>
            <option value="">— Select —</option>
            {COD_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </label>
      </fieldset>

      {/* Insurance */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Insurance</legend>
        <h3 className="fr-section-title">Insurance</h3>

        {/* Typeahead input */}
        <div className="ic-box" ref={icBoxRef}>
          <label>Insurance Company (type to search)
            <input
              type="text"
              value={icInput}
              onChange={(e) => {
                setIcInput(e.target.value);
                setSelectedIC(null);
                setIcOpen(true);
              }}
              onFocus={() => setIcOpen(true)}
              placeholder="Select the IC if you see it, otherwise just type the IC name"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          {icOpen && icMatches.length > 0 && (
            <div className="ic-list" role="listbox" aria-label="Insurance company suggestions">
              {icMatches.map(ic => (
                <div
                  key={ic.id}
                  className="ic-item"
                  role="option"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSelectedIC(ic);
                    setIcInput(ic.name);
                    setIcOpen(false);
                  }}
                >
                  <div>{ic.name}</div>
                  {/* Verification time intentionally NOT shown in suggestions */}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estimated Verification Time AFTER selection */}
        {!!selectedIC?.verificationTime && (
          <p className="fr-muted" style={{ marginTop: 6 }}>
            <strong>Estimated Verification Time:</strong> {selectedIC.verificationTime}
          </p>
        )}

        {/* Policy Numbers dynamic */}
        <div style={{ marginTop: 8 }}>
          <label>Policy Number
            <input type="text" value={policyNumbers[0]} onChange={(e) => updatePolicy(0, e.target.value)} />
          </label>

          {policyNumbers.slice(1).map((v, idx) => (
            <div key={idx} style={{ display: "grid", gap: 6, marginTop: 8 }}>
              <label>Policy Number
                <input type="text" value={v} onChange={(e) => updatePolicy(idx + 1, e.target.value)} />
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
            <input type="text" value={beneficiaries[0]} onChange={(e) => updateBeneficiary(0, e.target.value)} />
          </label>

          {beneficiaries.slice(1).map((v, idx) => (
            <div key={idx} style={{ display: "grid", gap: 6, marginTop: 8 }}>
              <label>Beneficiary
                <input type="text" value={v} onChange={(e) => updateBeneficiary(idx + 1, e.target.value)} />
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
              name="totalServiceAmount" type="text" inputMode="decimal" required
              value={totalServiceAmount}
              onChange={(e) => handleCurrencyInput(e.target.value, setTotalServiceAmount)}
              onBlur={(e) => handleCurrencyBlur(e.target.value, setTotalServiceAmount)}
              placeholder="$0.00"
            />
          </label>

          <label>Family Advancement Amount
            <input
              name="familyAdvancementAmount" type="text" inputMode="decimal"
              value={familyAdvancementAmount}
              onChange={(e) => handleCurrencyInput(e.target.value, setFamilyAdvancementAmount)}
              onBlur={(e) => handleCurrencyBlur(e.target.value, setFamilyAdvancementAmount)}
              placeholder="$0.00"
            />
          </label>

          <label>VIP Fee (3% or $100 min)
            <input
              name="vipFee" type="text"
              value={formatMoney(vipFeeCalc)}
              readOnly={!isAdmin}
              className={!isAdmin ? "fr-readonly" : undefined}
            />
          </label>

          <label>Total Assignment Amount
            <input
              name="assignmentAmount" type="text"
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

      {/* Notes */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Additional Notes</legend>
        <h3 className="fr-section-title">Additional Notes</h3>

        <textarea name="notes" rows={6} style={{ width: "100%" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </fieldset>

      {/* Upload */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Upload Assignment</legend>
        <h3 className="fr-section-title">Upload Assignment</h3>

        <input name="assignmentUpload" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.tif,.tiff,.webp,.gif,.txt" />
        <p className="fr-muted" style={{ marginTop: 6 }}>
          Max 500MB. Accepted: PDF, DOC/DOCX, PNG/JPG, TIFF, WEBP, TXT.
        </p>
      </fieldset>

      <button disabled={saving} className="fr-gold" type="submit">
        {saving ? "Submitting…" : "Submit Funding Request"}
      </button>

      {msg && <p role="alert" style={{ color: "crimson", marginTop: 8 }}>{msg}</p>}
    </form>
  );
}
