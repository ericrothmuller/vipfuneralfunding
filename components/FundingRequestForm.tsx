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

type BeneficiaryDetail = {
  name: string;
  relationship?: string;
  address?: string;
  dob?: string;
  ssn?: string;
  phone?: string;
};

const COD_OPTS = ["Natural", "Accident", "Homicide", "Pending"] as const;

/** v-flag-safe US phone pattern */
const PHONE_PATTERN_VSAFE = String.raw`[(]?\d{3}[)]?[\s-]?\d{3}-?\d{4}`;
const SSN_PATTERN = String.raw`\d{3}-\d{2}-\d{4}`;
const FILE_ACCEPT =
  ".pdf,.doc,.docx,.png,.jpg,.jpeg,.tif,.tiff,.webp,.gif,.txt";
const MAX_OTHER_UPLOADS = 50;

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
/** SSN formatter: 123456789 -> 123-45-6789 */
function formatSSN(value: string): string {
  const d = onlyDigits(value).slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

// Simple date formatter (YYYY-MM-DD -> MM/DD/YYYY)
function fmtDateMDY(iso?: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
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

  /** Address (in Decedent) */
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

  /** Structured beneficiary details (parallel to bundles[i].beneficiaries[j]) */
  const [beneExtra, setBeneExtra] = useState<BeneficiaryDetail[][]>([
    [{ name: "" }],
  ]);

  const addPolicyBundle = () =>
    setBundles((arr) => {
      setBeneExtra(prev => [...prev, [{ name: "" }]]);
      return [...arr, { beneficiaries: [""], policyNumber: "", faceAmount: "" }];
    });

  const removePolicyBundle = (idx: number) =>
    setBundles((arr) => {
      if (arr.length === 1) {
        setBeneExtra([[{ name: "" }]]);
        return [{ beneficiaries: [""], policyNumber: "", faceAmount: "" }];
      }
      setBeneExtra(prev => prev.filter((_, i) => i !== idx));
      return arr.filter((_, i) => i !== idx);
    });

  const updatePolicyNumber = (i: number, v: string) =>
    setBundles((arr) => arr.map((b, idx) => (idx === i ? { ...b, policyNumber: v } : b)));

  const updateFaceAmount = (i: number, v: string) =>
    setBundles((arr) => arr.map((b, idx) => (idx === i ? { ...b, faceAmount: v } : b)));

  const onFaceInput = (i: number, v: string) => handleCurrencyInput(v, (s) => updateFaceAmount(i, s));
  const onFaceBlur  = (i: number, v: string) => handleCurrencyBlur(v, (s) => updateFaceAmount(i, s));

  /** Beneficiary name array (kept as-is for submission) helpers */
  const updateBeneficiary = (i: number, j: number, v: string) =>
    setBundles((arr) =>
      arr.map((b, idx) =>
        idx === i ? { ...b, beneficiaries: b.beneficiaries.map((bv, jj) => (jj === j ? v : bv)) } : b
      )
    );

  const removeBeneficiary = (i: number, j: number) =>
    setBundles((arr) => {
      setBeneExtra(prev => {
        const copy = prev.map(row => row.slice());
        if (!copy[i]) copy[i] = [];
        copy[i] = copy[i].filter((_, jj) => jj !== j);
        return copy;
      });
      return arr.map((b, idx) =>
        idx === i
          ? { ...b, beneficiaries: b.beneficiaries.filter((_, jj) => jj !== j) }
          : b
      );
    });

  /** Add a new beneficiary slot and immediately open the modal to fill details */
  const addBeneficiary = (i: number) =>
    setBundles((arr) => {
      const next = arr.map((b, idx) =>
        idx === i ? { ...b, beneficiaries: [...b.beneficiaries, ""] } : b
      );
      setBeneExtra(prev => {
        const copy = prev.map(row => row.slice());
        if (!copy[i]) copy[i] = [];
        copy[i].push({ name: "" });
        return copy;
      });
      const newIdx = arr[i].beneficiaries.length; // new slot index
      openAddBeneficiary(i, newIdx);
      return next;
    });

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

  /** Upload (drag & drop + picker) */
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const assignmentInputRef = useRef<HTMLInputElement | null>(null);
  const [assignmentOver, setAssignmentOver] = useState(false);

  const [otherFiles, setOtherFiles] = useState<File[]>([]);
  const otherInputRef = useRef<HTMLInputElement | null>(null);
  const [otherOver, setOtherOver] = useState(false);

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

  /** ------------------- Beneficiary modals state ------------------- */
  const [beneModalOpen, setBeneModalOpen] = useState(false);
  const [beneViewOpen, setBeneViewOpen] = useState(false);
  const [benePolicyIdx, setBenePolicyIdx] = useState(0);
  const [beneIndex, setBeneIndex] = useState(0);
  const [beneDraft, setBeneDraft] = useState<BeneficiaryDetail>({
    name: "",
    relationship: "",
    address: "",
    dob: "",
    ssn: "",
    phone: "",
  });

  function openAddBeneficiary(policyIdx: number, idxInPolicy: number) {
    setBenePolicyIdx(policyIdx);
    setBeneIndex(idxInPolicy);
    const existing = beneExtra[policyIdx]?.[idxInPolicy] || { name: "" };
    setBeneDraft({
      name: bundles[policyIdx]?.beneficiaries[idxInPolicy] || existing.name || "",
      relationship: existing.relationship || "",
      address: existing.address || "",
      dob: existing.dob || "",
      ssn: existing.ssn || "",
      phone: existing.phone || "",
    });
    setBeneModalOpen(true);
  }

  function validateBeneficiary(b: BeneficiaryDetail): string | null {
    if (!b.name?.trim()) return "Beneficiary Name is required.";
    if (!b.relationship?.trim()) return "Relationship to DEC is required.";
    if (!b.address?.trim()) return "Beneficiary Address is required.";
    if (!b.dob?.trim()) return "Beneficiary DOB is required.";
    if (!b.ssn?.trim() || !/^\d{3}-\d{2}-\d{4}$/.test(b.ssn)) return "Beneficiary SSN must be ###-##-####.";
    if (!b.phone?.trim() || onlyDigits(b.phone).length !== 10) return "Beneficiary Phone must be 10 digits.";
    return null;
  }

  function saveBeneficiaryFromModal() {
    const name = (beneDraft.name || "").trim();
    const err = validateBeneficiary({ ...beneDraft, name });
    if (err) { alert(err); return; }

    setBeneExtra(prev => {
      const copy = prev.map(row => row.slice());
      if (!copy[benePolicyIdx]) copy[benePolicyIdx] = [];
      copy[benePolicyIdx][beneIndex] = { ...beneDraft, name };
      return copy;
    });
    updateBeneficiary(benePolicyIdx, beneIndex, name);
    setBeneModalOpen(false);
  }

  function openViewBeneficiary(policyIdx: number, idxInPolicy: number) {
    setBenePolicyIdx(policyIdx);
    setBeneIndex(idxInPolicy);
    const existing = beneExtra[policyIdx]?.[idxInPolicy] || { name: "" };
    setBeneDraft({
      name: bundles[policyIdx]?.beneficiaries[idxInPolicy] || existing.name || "",
      relationship: existing.relationship || "",
      address: existing.address || "",
      dob: existing.dob || "",
      ssn: existing.ssn || "",
      phone: existing.phone || "",
    });
    setBeneViewOpen(true);
  }

  /** ------------------- NEW: Download filled assignment ------------------- */
  async function downloadFilledAssignment() {
    try {
      const insuredFirstName = (decFirstName || "").trim();
      const insuredLastName = (decLastName || "").trim();
      const dateOfDeath = fmtDateMDY(decDOD);
      const assignmentAmount = formatMoney(
        parseMoneyNumber(totalServiceAmount) +
        parseMoneyNumber(familyAdvancementAmount) +
        Math.max(+((parseMoneyNumber(totalServiceAmount)+parseMoneyNumber(familyAdvancementAmount))*0.03).toFixed(2), 100)
      );

      const insuranceCompanyName = (selectedIC?.name || icInput || "").trim();
      const policyNumbers = bundles.map(b => b.policyNumber.trim()).filter(Boolean).join(", ");
      const fhRepName = (fhRep || "").trim();

      const payload = {
        insuredFirstName,
        insuredLastName,
        dateOfDeath,
        assignmentAmount,
        fhName: fhName || "",
        insuranceCompanyName,
        policyNumbers,
        fhRepName,
      };

      const res = await fetch("/api/forms/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed to generate PDF (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Assignment-Filled.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || "Could not generate filled assignment.");
    }
  }

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

      // Build death data
      if (deathInUS) fd.set("deathInUS", deathInUS);
      if (deathInUS === "No" && decPODCountry.trim()) fd.set("decPODCountry", decPODCountry.trim());
      fd.set("codNatural",  cod === "Natural"  ? "Yes" : "No");
      fd.set("codAccident", cod === "Accident" ? "Yes" : "No");
      fd.set("codHomicide", cod === "Homicide" ? "Yes" : "No");
      fd.set("codPending",  cod === "Pending"  ? "Yes" : "No");

      // Insurance mapping
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
      if (isEmployerInsurance === "Yes" && employerRelation) {
        fd.set("employerRelation", employerRelation);
      }

      // Linked bundles → compat + JSON
      const policyNumbers = bundles.map(b => b.policyNumber.trim()).filter(Boolean);
      const beneficiaries = bundles.flatMap(b => b.beneficiaries.map(x => x.trim()).filter(Boolean));
      const faceSum = bundles.reduce((sum, b) => sum + parseMoneyNumber(b.faceAmount), 0);
      fd.set("policyNumbers", policyNumbers.join(", "));
      fd.set("beneficiaries", beneficiaries.join(", "));
      fd.set("faceAmount", formatMoney(faceSum));
      fd.set("policyBeneficiaries", JSON.stringify(beneExtra));

      // computed currency
      fd.set("vipFee", formatMoney(vipFeeCalc));
      fd.set("assignmentAmount", formatMoney(
        parseMoneyNumber(totalServiceAmount) + parseMoneyNumber(familyAdvancementAmount) + Math.max(+((parseMoneyNumber(totalServiceAmount)+parseMoneyNumber(familyAdvancementAmount))*0.03).toFixed(2), 100)
      ));

      // Remove any auto-included file fields (we’ll control them)
      fd.delete("assignmentUpload");
      fd.delete("otherUploads");

      // Append our controlled files
      if (assignmentFile) {
        fd.set("assignmentUpload", assignmentFile);
      }
      if (otherFiles.length) {
        otherFiles.forEach((f) => fd.append("otherUploads", f));
      }

      const res = await fetch("/api/requests", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Server error (code ${res.status})`);

      // Clear local file state after successful submit
      setAssignmentFile(null);
      setOtherFiles([]);

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

        /* Dropzones */
        .dz {
          border:1px dashed var(--border);
          background:var(--field-bg);
          padding:14px;
          display:grid;
          place-items:center;
          text-align:center;
          cursor:pointer;
        }
        .dz.over { outline: 2px dashed var(--gold); outline-offset: 2px; }
        .dz small { color:var(--muted); }
        .file-list { display:grid; gap:6px; margin-top:8px; }
        .file-row { display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .file-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .btn-link { background:transparent; border:1px solid var(--border); padding:4px 8px; cursor:pointer; }

        .btn-ghost { border:1px solid var(--border); background:var(--field-bg); color:#fff; border-radius:0; padding:8px 10px; cursor:pointer; text-decoration:none; display:inline-block; }
        @media (prefers-color-scheme: light) {
          .btn-ghost { color:#000; }
        }
      `}</style>

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

      {/* Decedent (includes Address) */}
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
            <input
              name="decSSN"
              type="text"
              inputMode="numeric"
              pattern={SSN_PATTERN}
              maxLength={11}
              value={decSSN}
              onChange={(e) => setDecSSN(formatSSN(e.target.value))}
              placeholder="###-##-####"
              title="Enter SSN as 123-45-6789"
            />
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

        {/* Address moved here */}
        <label>DEC Address
          <input name="decAddress" type="text" value={decAddress} onChange={(e) => setDecAddress(e.target.value)} />
        </label>
        <div className="fr-grid-3-tight">
          <label>DEC City
            <input name="decCity" type="text" value={decCity} onChange={(e) => setDecCity(e.target.value)} />
          </label>
          <label>DEC State
            <input name="decState" type="text" value={decState} onChange={(e) => setDecState(e.target.value)} />
          </label>
          <label>DEC Zip
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
          {bundles.map((b, i) => {
            const hasAny = b.beneficiaries.some(name => !!name?.trim());
            const policyTitle = bundles.length === 1 ? "Policy" : `Policy #${i + 1}`;
            const beneHeader = b.beneficiaries.length >= 2 ? "Beneficiaries" : "Beneficiary";
            return (
              <div className="pb" key={i}>
                <div className="pb-head">
                  <strong>{policyTitle}</strong>
                  {bundles.length > 1 && (
                    <button type="button" className="fr-del" onClick={() => removePolicyBundle(i)}>
                      Remove Policy
                    </button>
                  )}
                </div>

                {/* Beneficiaries FIRST */}
                <div style={{ marginTop: 8 }}>
                  <label>{beneHeader}</label>
                  {/* First slot */}
                  {b.beneficiaries[0] ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 600 }}>{b.beneficiaries[0]}</div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => openViewBeneficiary(i, 0)}
                      >
                        View Info
                      </button>
                      {/* allow remove first beneficiary */}
                      <button
                        type="button"
                        className="fr-del"
                        onClick={() => removeBeneficiary(i, 0)}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    // Initial state: only this button appears (no duplicate add button below)
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => openAddBeneficiary(i, 0)}
                    >
                      + Add Beneficiary
                    </button>
                  )}

                  {/* Additional beneficiaries */}
                  {b.beneficiaries.slice(1).map((val, j) => {
                    const realIdx = j + 1;
                    return (
                      <div key={realIdx} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        <div style={{ fontWeight: 600 }}>{val || "(unnamed beneficiary)"}</div>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => (val ? openViewBeneficiary(i, realIdx) : openAddBeneficiary(i, realIdx))}
                        >
                          {val ? "View Info" : "Add Info"}
                        </button>
                        <button
                          type="button"
                          className="fr-del"
                          onClick={() => removeBeneficiary(i, realIdx)}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}

                  {/* Show "Add Another Beneficiary" only after the first has a name */}
                  {hasAny && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => addBeneficiary(i)}
                      style={{ marginTop: 8 }}
                    >
                      + Add Another Beneficiary
                    </button>
                  )}
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
            );
          })}
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
              value={formatMoney( parseMoneyNumber(totalServiceAmount) + parseMoneyNumber(familyAdvancementAmount) + Math.max(+((parseMoneyNumber(totalServiceAmount)+parseMoneyNumber(familyAdvancementAmount))*0.03).toFixed(2), 100) )}
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

      {/* Download Assignment */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Download Assignment</legend>
        <h3 className="fr-section-title">Download Assignment</h3>
        <p className="fr-muted" style={{ marginBottom: 10 }}>
          Download and print the assignment, complete all required fields in their entirety, obtain the signatures of all necessary parties, and ensure the document is properly notarized.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Blank template download (ghost style/no underline) */}
          <a
            href={"/Funding%20Request%20Assignment.pdf"}
            download
            className="btn-ghost"
            aria-label="Download blank assignment PDF"
          >
            Download
          </a>

          {/* New filled form download */}
          <button
            type="button"
            className="btn-ghost"
            onClick={downloadFilledAssignment}
            aria-label="Download filled assignment PDF"
          >
            Download Filled
          </button>
        </div>
      </fieldset>

      {/* Upload Assignment (with drag & drop) */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Upload Assignment</legend>
        <h3 className="fr-section-title">Upload Assignment</h3>

        {/* hidden input to keep native picker */}
        <input
          ref={assignmentInputRef}
          name="assignmentUpload"
          type="file"
          accept={FILE_ACCEPT}
          onChange={(e) => setAssignmentFile(e.currentTarget.files?.[0] || null)}
          style={{ display: "none" }}
        />

        <div
          className={`dz ${assignmentOver ? "over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setAssignmentOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); setAssignmentOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setAssignmentOver(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setAssignmentOver(false);
            const dtFiles = Array.from(e.dataTransfer.files || []);
            if (dtFiles.length > 0) setAssignmentFile(dtFiles[0]);
          }}
          onClick={() => assignmentInputRef.current?.click()}
          role="button"
          aria-label="Drop assignment file here or click to browse"
          tabIndex={0}
        >
          <div>
            <strong>Drag & drop the assignment here</strong>
            <div style={{ marginTop: 6 }}><button type="button" className="btn-link">Browse file</button></div>
            <small>Accepted: PDF, DOC/DOCX, PNG/JPG, TIFF, WEBP, GIF, TXT. Max 500MB.</small>
          </div>
        </div>

        {assignmentFile && (
          <div className="file-list">
            <div className="file-row">
              <span className="file-name">{assignmentFile.name}</span>
              <button
                type="button"
                className="btn-link"
                onClick={() => setAssignmentFile(null)}
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </fieldset>

      {/* Upload Other Documents (drag & drop + multiple) */}
      <fieldset className="fr-card">
        <legend className="fr-legend">Upload Other Documents</legend>
        <h3 className="fr-section-title">Upload Other Documents</h3>

        {/* hidden input to keep native picker */}
        <input
          ref={otherInputRef}
          name="otherUploads"
          type="file"
          multiple
          accept={FILE_ACCEPT}
          onChange={(e) => {
            const incoming = Array.from(e.currentTarget.files || []);
            if (!incoming.length) return;
            const space = MAX_OTHER_UPLOADS - otherFiles.length;
            if (space <= 0) return;
            setOtherFiles(prev => [...prev, ...incoming.slice(0, space)]);
            (e.currentTarget as HTMLInputElement).value = "";
          }}
          style={{ display: "none" }}
        />

        <div
          className={`dz ${otherOver ? "over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setOtherOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); setOtherOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setOtherOver(false); }}
          onDrop={(e) => {
            e.preventDefault(); setOtherOver(false);
            const incoming = Array.from(e.dataTransfer.files || []);
            if (!incoming.length) return;
            const space = MAX_OTHER_UPLOADS - otherFiles.length;
            if (space <= 0) return;
            setOtherFiles(prev => [...prev, ...incoming.slice(0, space)]);
          }}
          onClick={() => otherInputRef.current?.click()}
          role="button"
          aria-label="Drop other documents here or click to browse"
          tabIndex={0}
        >
          <div>
            <strong>Drag & drop documents here</strong>
            <div style={{ marginTop: 6 }}><button type="button" className="btn-link">Browse files</button></div>
            <small>Up to 50 files. Max 500MB each. Accepted: PDF, DOC/DOCX, PNG/JPG, TIFF, WEBP, GIF, TXT.</small>
          </div>
        </div>

        {otherFiles.length > 0 && (
          <div className="file-list" aria-live="polite">
            {otherFiles.map((f, idx) => (
              <div key={idx} className="file-row">
                <span className="file-name">{idx + 1}. {f.name}</span>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setOtherFiles(prev => prev.filter((_, i) => i !== idx))}
                >
                  Remove
                </button>
              </div>
            ))}
            <small>{otherFiles.length} / {MAX_OTHER_UPLOADS} selected</small>
          </div>
        )}
      </fieldset>

      <button disabled={saving} className="fr-gold fr-submit" type="submit">
        {saving ? "Submitting…" : "Submit Funding Request"}
      </button>

      {msg && <p role="alert" style={{ color: "crimson", marginTop: 8 }}>{msg}</p>}

      {/* Add Beneficiary Modal */}
      {beneModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="bene-add-title">
          <div className="modal">
            <div className="modal-header">
              <h3 id="bene-add-title" className="modal-title">Add Beneficiary</h3>
              <button className="btn btn-ghost" onClick={() => setBeneModalOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <label>Beneficiary Name *
                <input
                  type="text"
                  value={beneDraft.name}
                  onChange={(e) => setBeneDraft({ ...beneDraft, name: e.target.value })}
                  placeholder="Full name"
                  required
                />
              </label>
              <div className="row-2">
                <label>Relationship to DEC *
                  <input
                    type="text"
                    value={beneDraft.relationship || ""}
                    onChange={(e) => setBeneDraft({ ...beneDraft, relationship: e.target.value })}
                    placeholder="e.g., Spouse, Child"
                    required
                  />
                </label>
                <label>Beneficiary DOB *
                  <input
                    type="date"
                    value={beneDraft.dob || ""}
                    onChange={(e) => setBeneDraft({ ...beneDraft, dob: e.target.value })}
                    required
                  />
                </label>
              </div>
              <label>Beneficiary Address *
                <input
                  type="text"
                  value={beneDraft.address || ""}
                  onChange={(e) => setBeneDraft({ ...beneDraft, address: e.target.value })}
                  placeholder="Street, City, State ZIP"
                  required
                />
              </label>
              <div className="row-2">
                <label>Beneficiary SSN *
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern={SSN_PATTERN}
                    maxLength={11}
                    value={beneDraft.ssn || ""}
                    onChange={(e) => setBeneDraft({ ...beneDraft, ssn: formatSSN(e.target.value) })}
                    placeholder="###-##-####"
                    title="Enter SSN as 123-45-6789"
                    required
                  />
                </label>
                <label>Beneficiary Phone Number *
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern={PHONE_PATTERN_VSAFE}
                    value={beneDraft.phone || ""}
                    onChange={(e) => setBeneDraft({ ...beneDraft, phone: formatPhone(e.target.value) })}
                    placeholder="(555) 555-5555"
                    title="Please enter a valid 10-digit phone number"
                    required
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button className="btn" onClick={() => setBeneModalOpen(false)}>Cancel</button>
                <button className="btn btn-gold" onClick={saveBeneficiaryFromModal}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Beneficiary Modal */}
      {beneViewOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="bene-view-title">
          <div className="modal">
            <div className="modal-header">
              <h3 id="bene-view-title" className="modal-title">Beneficiary Info</h3>
              <button className="btn btn-ghost" onClick={() => setBeneViewOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <div><strong>Name:</strong> {beneDraft.name || "—"}</div>
              <div><strong>Relationship to DEC:</strong> {beneDraft.relationship || "—"}</div>
              <div><strong>Address:</strong> {beneDraft.address || "—"}</div>
              <div className="row-2">
                <div><strong>DOB:</strong> {beneDraft.dob || "—"}</div>
                <div><strong>SSN:</strong> {beneDraft.ssn || "—"}</div>
              </div>
              <div><strong>Phone:</strong> {beneDraft.phone || "—"}</div>
              <div className="modal-actions">
                <button className="btn" onClick={() => setBeneViewOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
