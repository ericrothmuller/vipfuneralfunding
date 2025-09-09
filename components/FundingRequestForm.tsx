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

// A linked bundle of Beneficiaries[] → Policy Number → Face Amount
type PolicyBundle = {
  beneficiaries: string[];
  policyNumber: string;
  faceAmount: string; // currency string (formatted on blur)
};

const COD_OPTS = ["Natural", "Accident", "Homicide", "Pending"] as const;

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

// Simpler setter type to avoid TS friction
type Setter = (next: string) => void;

/** Currency inputs: free typing; format on blur */
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

  /** Marital Status (dropdown) */
  const [decMaritalStatus, setDecMaritalStatus] = useState("");

  /** Address */
  const [decAddress, setDecAddress] = useState("");
  const [decCity, setDecCity] = useState("");
  const [decState, setDecState] = useState("");
  const [decZip, setDecZip] = useState("");

  /** Death (formerly Place of Death) */
  const [decPODCity, setDecPODCity] = useState("");
  const [decPODState, setDecPODState] = useState("");
  const [deathInUS, setDeathInUS] = useState("");
  const [decPODCountry, setDecPODCountry] = useState("");
  const [cod, setCod] = useState<string>("");
  const [hasFinalDC, setHasFinalDC] = useState<string>("");

  /** Employer (within Insurance section) */
  const [isEmployerInsurance, setIsEmployerInsurance] = useState<string>("");
  const [employerCompanyName, setEmployerCompanyName] = useState("");
  const [employerPhone, setEmployerPhone] = useState("");
  const [employerContact, setEmployerContact] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState<string>("");
  const [employerRelation, setEmployerRelation] = useState<string>("");

  /** Insurance company typeahead state */
  const [icInput, setIcInput] = useState("");
  const [icOpen, setIcOpen] = useState(false);
  const [selectedIC, setSelectedIC] = useState<IC | null>(null);
  const icBoxRef = useRef<HTMLDivElement | null>(null);

  /** Linked policy bundles (Beneficiaries → Policy Number → Face Amount) */
  const [bundles, setBundles] = useState<PolicyBundle[]>([
    { beneficiaries: [""], policyNumber: "", faceAmount: "" },
  ]);

  const addPolicyBundle = () =>
    setBundles((arr) => [...arr, { beneficiaries: [""], policyNumber: "", faceAmount: "" }]);

  const removePolicyBundle = (idx: number) =>
    setBundles((arr) => {
      if (arr.length === 1) return [{ beneficiaries: [""], policyNumber: "", faceAmount: "" }];
      return arr.filter((_, i) => i !== idx);
    });

  const updatePolicyNumber = (i: number, v: string) =>
    setBundles((arr) => arr.map((b, idx) => (idx === i ? { ...b, policyNumber: v } : b)));

  const updateFaceAmount = (i: number, v: string) =>
    setBundles((arr) => arr.map((b, idx) => (idx === i ? { ...b, faceAmount: v } : b)));

  const onFaceInput = (i: number, v: string) => handleCurrencyInput(v, (s) => updateFaceAmount(i, s));
  const onFaceBlur  = (i: number, v: string) => handleCurrencyBlur(v, (s) => updateFaceAmount(i, s));

  const addBeneficiary = (i: number) =>
    setBundles((arr) => arr.map((b, idx) => (idx === i ? { ...b, beneficiaries: [...b.beneficiaries, ""] } : b)));

  const updateBeneficiary = (i: number, j: number, v: string) =>
    setBundles((arr) =>
      arr.map((b, idx) =>
        idx === i ? { ...b, beneficiaries: b.beneficiaries.map((bv, jj) => (jj === j ? v : bv)) } : b
      )
    );

  const removeBeneficiary = (i: number, j: number) =>
    setBundles((arr) =>
      arr.map((b, idx) =>
        idx === i
          ? { ...b, beneficiaries: b.beneficiaries.filter((_, jj) => jj !== j) }
          : b
      )
    );

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

  /** Notes */
  const [notes, setNotes] = useState("");

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

  /** ------------------- Submit ------------------- */
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      if (!cod) throw new Error("Cause of Death is required.");
      if (!hasFinalDC) throw new Error("Final Death Certificate selection is required.");

      const form = e.currentTarget;
      const fd = new FormData(form);

      // ---- Death wiring ----
      if (deathInUS) fd.set("deathInUS", deathInUS);
      if (deathInUS === "No" && decPODCountry.trim()) fd.set("decPODCountry", decPODCountry.trim());
      fd.set("codNatural",  cod === "Natural"  ? "Yes" : "No");
      fd.set("codAccident", cod === "Accident" ? "Yes" : "No");
      fd.set("codHomicide", cod === "Homicide" ? "Yes" : "No");
      fd.set("codPending",  cod === "Pending"  ? "Yes" : "No");

      // ---- Insurance mapping: ID if selected, otherwise free text as otherIC_name
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

      // ---- Employer extras
      if (isEmployerInsurance === "Yes") {
        if (employerRelation) fd.set("employerRelation", employerRelation);
      }

      // ---- Linked bundles → compat fields + JSON
      const policyNumbers = bundles.map(b => b.policyNumber.trim()).filter(Boolean);
      const beneficiaries = bundles.flatMap(b => b.beneficiaries.map(x => x.trim()).filter(Boolean));
      const faceSum = bundles.reduce((sum, b) => sum + parseMoneyNumber(b.faceAmount), 0);

      fd.set("policyNumbers", policyNumbers.join(", "));
      fd.set("beneficiaries", beneficiaries.join(", "));
      fd.set("faceAmount", formatMoney(faceSum));     // compat
      fd.set("policyBundles", JSON.stringify(bundles));

      // ---- computed currency
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
        .fr-form { --title-color:#d6b16d; --card-bg:#0b0d0f; --border:#1a1c1f; --field-bg:#121416; --muted:#e0e0e0; font-size:18px; line-height:1.45; display:grid; gap:16px; }
        @media (prefers-color-scheme: light) { .fr-form { --title-color:#000; --card-bg:#fff; --border:#d0d5dd; --field-bg:#f2f4f6; --muted:#333; } }

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
        .fr-submit { border:1px solid var(--border); }

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
        .ic-list { position:absolute; z-index:30; top:calc(100% + 4px); left:0; right:0; background:var(--card-bg); border:1px solid var(--border); border-radius:0; max-height:240px; overflow:auto; }
        .ic-item { padding:8px 10px; cursor:pointer; }
        .ic-item:hover { background:rgba(255,255,255,.06); }

        /* Policy bundle card (visual grouping) */
        .pb { border:1px dashed var(--border); padding:10px; margin-top:8px; }
        .pb-head { display:flex; justify-content:space-between; align-items:center; gap:8px; }
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
          <select
            name="decMaritalStatus"
            value={decMaritalStatus}
            onChange={(e) => setDecMaritalStatus(e.target.value)}
          >
            <option value="">— Select —</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Divorced">Divorced</option>
            <option value="Separated">Separated</option>
          </select>
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

      {/* Death */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Death</legend>
        <h3 className="fr-section-title">Death</h3>

        <div className="fr-grid-2">
          <label>City (Place of Death)
            <input name="decPODCity" type="text" value={decPODCity} onChange={(e) => setDecPODCity(e.target.value)} />
          </label>
          <label>State (Place of Death)
            <input name="decPODState" type="text" value={decPODState} onChange={(e) => setDecPODState(e.target.value)} />
          </label>
        </div>

        <div className="fr-grid-2">
          <label>Was the Death in the U.S.?
            <select
              name="deathInUS"
              value={deathInUS}
              onChange={(e) => setDeathInUS(e.target.value)}
            >
              <option value="">— Select —</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </label>

          <label>Cause of Death
            <select
              name="codSingle"
              required
              value={cod}
              onChange={(e) => setCod(e.target.value)}
            >
              <option value="">— Select —</option>
              {COD_OPTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </label>
        </div>

        {deathInUS === "No" && (
          <label>Country (Place of Death)
            <input
              name="decPODCountry"
              type="text"
              value={decPODCountry}
              onChange={(e) => setDecPODCountry(e.target.value)}
            />
          </label>
        )}

        <label>Do you have the Final Death Certificate?
          <select
            name="hasFinalDC"
            required
            value={hasFinalDC}
            onChange={(e) => setHasFinalDC(e.target.value)}
          >
            <option value="">— Select —</option>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </label>
      </fieldset>

      {/* Insurance */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Insurance</legend>
        <h3 className="fr-section-title">Insurance</h3>

        {/* Employer question + conditional fields */}
        <label>Is the insurance through the deceased&apos;s employer?
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

        {isEmployerInsurance === "Yes" && (
          <div className="fr-grid-2" style={{ marginTop: 8 }}>
            <label>Deceased was the
              <select
                name="employerRelation"
                value={employerRelation}
                onChange={(e) => setEmployerRelation(e.target.value)}
              >
                <option value="">— Select —</option>
                <option value="Employee">Employee</option>
                <option value="Dependent">Dependent</option>
              </select>
            </label>

            <label>Name of Employer
              <input
                name="employerCompanyName"
                type="text"
                value={employerCompanyName}
                onChange={(e) => setEmployerCompanyName(e.target.value)}
              />
            </label>

            <label>Employer Phone
              <input
                name="employerPhone"
                type="tel"
                inputMode="numeric"
                pattern={PHONE_PATTERN_VSAFE}
                value={employerPhone}
                onChange={(e) => setEmployerPhone(formatPhone(e.target.value))}
                placeholder="(555) 555-5555"
                title="Please enter a valid 10-digit phone number"
              />
            </label>

            <label>Employer Contact Name
              <input
                name="employerContact"
                type="text"
                value={employerContact}
                onChange={(e) => setEmployerContact(e.target.value)}
              />
            </label>

            <label>Employment Status
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

        {/* IC Typeahead */}
        <div className="ic-box" ref={icBoxRef} style={{ marginTop: 8 }}>
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

        {/* Linked Policy Bundles */}
        <div style={{ marginTop: 8 }}>
          {bundles.map((b, i) => (
            <div className="pb" key={i}>
              <div className="pb-head">
                <strong>Policy {i + 1}</strong>
                {bundles.length > 1 && (
                  <button type="button" className="fr-del" onClick={() => removePolicyBundle(i)}>
                    Remove Policy
                  </button>
                )}
              </div>

              {/* Beneficiaries FIRST */}
              <div style={{ marginTop: 8 }}>
                <label>Beneficiary
                  <input
                    type="text"
                    value={b.beneficiaries[0]}
                    onChange={(e) => updateBeneficiary(i, 0, e.target.value)}
                  />
                </label>

                {b.beneficiaries.slice(1).map((val, j) => (
                  <div key={j} style={{ display: "grid", gap: 6, marginTop: 8 }}>
                    <label>Beneficiary
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => updateBeneficiary(i, j + 1, e.target.value)}
                      />
                    </label>
                    <div className="fr-inline-actions">
                      <button
                        type="button"
                        className="fr-del"
                        onClick={() => removeBeneficiary(i, j + 1)}
                      >
                        Remove Beneficiary
                      </button>
                    </div>
                  </div>
                ))}

                <button type="button" className="btn btn-ghost" onClick={() => addBeneficiary(i)} style={{ marginTop: 8 }}>
                  + Add Beneficiary
                </button>
              </div>

              {/* Then Policy Number */}
              <label style={{ marginTop: 8 }}>Policy Number
                <input
                  type="text"
                  value={b.policyNumber}
                  onChange={(e) => updatePolicyNumber(i, e.target.value)}
                />
              </label>

              {/* Then Face Amount */}
              <label style={{ marginTop: 8 }}>Face Amount
                <input
                  type="text"
                  inputMode="decimal"
                  value={b.faceAmount}
                  onChange={(e) => onFaceInput(i, e.target.value)}
                  onBlur={(e) => onFaceBlur(i, e.target.value)}
                  placeholder="$0.00"
                />
              </label>

              {/* Add Policy Number button only under the last bundle */}
              {i === bundles.length - 1 && (
                <button type="button" className="btn btn-ghost" onClick={addPolicyBundle} style={{ marginTop: 8 }}>
                  + Add Policy Number
                </button>
              )}
            </div>
          ))}
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
          VIP fee is calculated as 3% of (Service + Advancement), with a minimum of $100.<br />
          Total Assignment = Service + Advancement + VIP.
        </p>
      </fieldset>

      {/* Notes */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Additional Notes</legend>
        <h3 className="fr-section-title">Additional Notes</h3>

        <textarea name="notes" rows={6} style={{ width: "100%" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </fieldset>

      {/* Upload Assignment */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Upload Assignment</legend>
        <h3 className="fr-section-title">Upload Assignment</h3>

        <input name="assignmentUpload" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.tif,.tiff,.webp,.gif,.txt" />
        <p className="fr-muted" style={{ marginTop: 6 }}>
          Max 500MB. Accepted: PDF, DOC/DOCX, PNG/JPG, TIFF, WEBP, TXT.
        </p>
      </fieldset>

      {/* NEW: Upload Other Documents */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Upload Other Documents</legend>
        <h3 className="fr-section-title">Upload Other Documents</h3>

        <input
          name="otherUploads"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.tif,.tiff,.webp,.gif,.txt"
        />
        <p className="fr-muted" style={{ marginTop: 6 }}>
          You can upload up to 50 files. Max 500MB each. Accepted: PDF, DOC/DOCX, PNG/JPG, TIFF, WEBP, GIF, TXT.
        </p>
      </fieldset>

      <button disabled={saving} className="fr-gold fr-submit" type="submit">
        {saving ? "Submitting…" : "Submit Funding Request"}
      </button>

      {msg && <p role="alert" style={{ color: "crimson", marginTop: 8 }}>{msg}</p>}
    </form>
  );
}
