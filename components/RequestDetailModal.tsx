// components/RequestDetailModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const FILE_ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.tif,.tiff,.webp,.gif,.txt";
const MAX_OTHER_UPLOADS = 50;
const MAX_ASSIGNMENT_UPLOADS = 10;

type OtherIC = {
  name?: string;
  phone?: string;
  fax?: string;
  notes?: string;
};

type BeneficiaryDetail = {
  name?: string;
  relationship?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
  phone?: string;
  ssn?: string;
  dob?: string;
};

type PolicyItem = {
  policyNumber?: string;
  faceAmount?: string; // formatted string
};

type RequestDetail = {
  id: string;
  userId?: string;

  // FH/CEM
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

  // Address
  decAddress?: string;
  decCity?: string;
  decState?: string;
  decZip?: string;

  // Place of death
  decPODCity?: string;
  decPODState?: string;
  decPODCountry?: string;
  deathInUS?: boolean;

  // COD flags
  codNatural?: boolean;
  codAccident?: boolean;
  codHomicide?: boolean;
  codPending?: boolean;
  codSuicide?: boolean;

  // Certificates
  hasFinalDC?: boolean;

  // Employer
  employerPhone?: string;
  employerContact?: string;   // Contact Name
  employerEmail?: string;     // NEW
  employmentStatus?: string;
  employerRelation?: "Employee" | "Dependent" | "";

  // Insurance linkage
  insuranceCompanyId?: string | { _id?: string; name?: string };
  otherInsuranceCompany?: OtherIC;
  insuranceCompany?: string;
  policyNumbers?: string;
  faceAmount?: string;
  beneficiaries?: string;

  // Structured
  policyBeneficiaries?: BeneficiaryDetail[][];
  policies?: PolicyItem[];

  // Financials
  totalServiceAmount?: string;
  familyAdvancementAmount?: string;
  vipFee?: string;
  assignmentAmount?: string;

  // Misc
  notes?: string;

  // Uploads
  assignmentUploadPath?: string;
  assignmentUploadPaths?: string[];
  otherUploadPaths?: string[];

  status?: "Submitted" | "Verifying" | "Approved" | "Funded" | "Closed" | string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

function fmtBool(b: any) { return b ? "Yes" : "No"; }
function fmtDate(d?: string | Date | null) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toLocaleDateString();
}
function onlyDigits(s: string) { return String(s || "").replace(/\D+/g, ""); }
function formatPhone(s: string) {
  const d = onlyDigits(s).slice(0, 10);
  const p1 = d.slice(0, 3), p2 = d.slice(3, 6), p3 = d.slice(6, 10);
  if (d.length <= 3) return p1;
  if (d.length <= 6) return `(${p1}) ${p2}`;
  return `(${p1}) ${p2}-${p3}`;
}
function formatSSN(value: string): string {
  const d = onlyDigits(value).slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}
function parseMoneyNumber(s: string | undefined): number {
  const n = Number(String(s ?? "").replace(/[^0-9.]+/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}
function codFromFlags(d: RequestDetail): "" | "Natural" | "Accident" | "Homicide" | "Pending" {
  if (d.codNatural) return "Natural";
  if (d.codAccident) return "Accident";
  if (d.codHomicide) return "Homicide";
  if (d.codPending) return "Pending";
  return "";
}
function companyDisplay(data: RequestDetail): string {
  const populatedName =
    typeof data.insuranceCompanyId === "object" && data.insuranceCompanyId?.name
      ? data.insuranceCompanyId.name
      : "";
  const otherName = data.otherInsuranceCompany?.name || "";
  const legacy = data.insuranceCompany || "";
  return populatedName || otherName || legacy || "";
}

export default function RequestDetailModal({
  id,
  isAdmin = false,
  onClose,
  canDelete = false,
  onDeleted,
  onUpdated,
}: {
  id: string;
  isAdmin?: boolean;
  onClose: () => void;
  canDelete?: boolean;
  onDeleted?: (id: string) => void;
  onUpdated?: (updated: Partial<RequestDetail> & { id: string }) => void;
}) {
  const [data, setData] = useState<RequestDetail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // editable fields (non-beneficiary)
  const [fhRep, setFhRep] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [decFirstName, setDecFirstName] = useState("");
  const [decLastName, setDecLastName] = useState("");
  const [decSSN, setDecSSN] = useState("");
  const [decDOB, setDecDOB] = useState("");
  const [decDOD, setDecDOD] = useState("");
  const [decMaritalStatus, setDecMaritalStatus] = useState("");

  const [decAddress, setDecAddress] = useState("");
  const [decCity, setDecCity] = useState("");
  const [decState, setDecState] = useState("");
  const [decZip, setDecZip] = useState("");

  const [decPODCity, setDecPODCity] = useState("");
  const [decPODState, setDecPODState] = useState("");
  const [decPODCountry, setDecPODCountry] = useState("");
  const [deathInUS, setDeathInUS] = useState<"" | "Yes" | "No">("");

  const [cod, setCod] = useState<"" | "Natural" | "Accident" | "Homicide" | "Pending">("");
  const [hasFinalDC, setHasFinalDC] = useState<"" | "Yes" | "No">("");

  const [employerRelation, setEmployerRelation] = useState<"" | "Employee" | "Dependent">("");
  const [employerPhone, setEmployerPhone] = useState("");
  const [employerContact, setEmployerContact] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [employerEmail, setEmployerEmail] = useState("");

  const [policyNumbers, setPolicyNumbers] = useState("");
  const [faceAmount, setFaceAmount] = useState("");

  // CSV fallback (read-only in edit mode)
  const [beneficiariesCsv, setBeneficiariesCsv] = useState("");

  const [totalServiceAmount, setTotalServiceAmount] = useState("");
  const [familyAdvancementAmount, setFamilyAdvancementAmount] = useState("");
  const vipFeeCalc = useMemo(() => {
    const base = parseMoneyNumber(totalServiceAmount) + parseMoneyNumber(familyAdvancementAmount);
    const pct = Math.max(100, Math.round(base * 0.03 * 100) / 100);
    return pct;
  }, [totalServiceAmount, familyAdvancementAmount]);
  const assignmentAmountCalc = useMemo(() => {
    const base = parseMoneyNumber(totalServiceAmount) + parseMoneyNumber(familyAdvancementAmount);
    return base + vipFeeCalc;
  }, [totalServiceAmount, familyAdvancementAmount, vipFeeCalc]);

  const [notes, setNotes] = useState("");

  // uploads (additions)
  const [assignAdds, setAssignAdds] = useState<File[]>([]);
  const [assignOver, setAssignOver] = useState(false);
  const assignInputRef = useRef<HTMLInputElement | null>(null);

  const [otherAdds, setOtherAdds] = useState<File[]>([]);
  const [otherOver, setOtherOver] = useState(false);
  const otherInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedAssignCount = data?.assignmentUploadPaths?.length
    ? data.assignmentUploadPaths.length
    : (data?.assignmentUploadPath ? 1 : 0);

  // Beneficiaries (global list) + modal (view)
  const [beneList, setBeneList] = useState<Array<{ name: string; detail?: BeneficiaryDetail }>>([]);
  const [beneOpen, setBeneOpen] = useState(false);
  const [beneSelected, setBeneSelected] = useState<{ name: string; detail?: BeneficiaryDetail } | null>(null);

  // Beneficiary Edit modal state
  const [beneEditOpen, setBeneEditOpen] = useState(false);
  const [beneEditDraft, setBeneEditDraft] = useState<BeneficiaryDetail>({});
  const [beneEditRef, setBeneEditRef] = useState<{ pIdx: number; bIdx: number } | null>(null);

  function buildBeneficiaries(r: RequestDetail) {
    const map = new Map<string, BeneficiaryDetail>();
    const nameNorm = (s?: string) => (s || "").trim().toLowerCase();

    if (Array.isArray(r.policyBeneficiaries)) {
      for (const row of r.policyBeneficiaries) {
        for (const ben of (row || [])) {
          const nm = (ben?.name || "").trim();
          if (!nm) continue;
          const key = nameNorm(nm);
          const prev = map.get(key) || {};
          const prevFilled = Object.values(prev).filter(Boolean).length;
          const nextFilled = Object.values(ben || {}).filter(Boolean).length;
          map.set(key, nextFilled >= prevFilled ? { ...ben } : prev);
        }
      }
    }

    const names = (r.beneficiaries ?? "").split(",").map(s => s.trim()).filter(Boolean);
    for (const nm of names) {
      const key = nameNorm(nm);
      if (!map.has(key)) map.set(key, { name: nm });
      else { const d = map.get(key)!; if (!d.name) d.name = nm; }
    }

    const arr: Array<{ name: string; detail?: BeneficiaryDetail }> = [];
    for (const [, detail] of map.entries()) arr.push({ name: (detail.name || "").trim(), detail });
    arr.sort((a, b) => a.name.localeCompare(b.name));
    setBeneList(arr);
  }

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
        if (!mounted) return;
        const r: RequestDetail = json.request;
        setData(r);

        setFhRep(r.fhRep || "");
        setContactPhone(r.contactPhone || "");
        setContactEmail(r.contactEmail || "");

        setDecFirstName(r.decFirstName || "");
        setDecLastName(r.decLastName || "");
        setDecSSN(r.decSSN || "");
        setDecDOB(r.decDOB ? new Date(r.decDOB).toISOString().slice(0, 10) : "");
        setDecDOD(r.decDOD ? new Date(r.decDOD).toISOString().slice(0, 10) : "");
        setDecMaritalStatus(r.decMaritalStatus || "");

        setDecAddress(r.decAddress || "");
        setDecCity(r.decCity || "");
        setDecState(r.decState || "");
        setDecZip(r.decZip || "");

        setDecPODCity(r.decPODCity || "");
        setDecPODState(r.decPODState || "");
        setDecPODCountry(r.decPODCountry || "");
        setDeathInUS(r.deathInUS === true ? "Yes" : r.deathInUS === false ? "No" : "");

        setCod(codFromFlags(r));
        setHasFinalDC(r.hasFinalDC === true ? "Yes" : r.hasFinalDC === false ? "No" : "");

        setEmployerRelation((r.employerRelation as any) || "");
        setEmployerPhone(r.employerPhone || "");
        setEmployerContact(r.employerContact || "");
        setEmploymentStatus(r.employmentStatus || "");
        setEmployerEmail(r.employerEmail || "");

        setPolicyNumbers(r.policyNumbers || "");
        setFaceAmount(r.faceAmount || "");
        setBeneficiariesCsv(r.beneficiaries || "");

        setTotalServiceAmount(r.totalServiceAmount || "");
        setFamilyAdvancementAmount(r.familyAdvancementAmount || "");
        setNotes(r.notes || "");

        buildBeneficiaries(r);
      } catch (e: any) {
        setMsg(e?.message || "Could not load request");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this funding request? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Delete failed (code ${res.status})`);
      onDeleted?.(id);
    } catch (e: any) {
      setMsg(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const canEdit = !!data && (isAdmin || (data.status === "Submitted"));

  // -------- Beneficiary Edit handling ----------
  function openBeneficiaryEdit(pIdx: number, bIdx: number, ben: BeneficiaryDetail) {
    setBeneEditRef({ pIdx, bIdx });
    setBeneEditDraft({
      name: ben?.name || "",
      relationship: ben?.relationship || "",
      dob: ben?.dob || "",
      ssn: ben?.ssn || "",
      phone: ben?.phone || "",
      email: ben?.email || "",
      address: ben?.address || "",
      city: ben?.city || "",
      state: ben?.state || "",
      zip: ben?.zip || "",
    });
    setBeneEditOpen(true);
  }

  function updateLocalPolicyBeneficiaries(
    list: BeneficiaryDetail[][],
    ref: { pIdx: number; bIdx: number },
    draft: BeneficiaryDetail
  ): BeneficiaryDetail[][] {
    const copy = list.map(row => row ? row.map(b => ({ ...b })) : []);
    if (!copy[ref.pIdx]) copy[ref.pIdx] = [];
    copy[ref.pIdx][ref.bIdx] = { ...draft };
    return copy;
  }

  function rebuildBeneficiariesCSV(list: BeneficiaryDetail[][], fallbackCsv: string): string {
    const names: string[] = [];
    if (Array.isArray(list)) {
      for (const row of list) {
        for (const ben of (row || [])) {
          const nm = (ben?.name || "").trim();
          if (nm) names.push(nm);
        }
      }
    }
    if (names.length) return names.join(", ");
    return fallbackCsv || "";
  }

  async function saveBeneficiaryEdit() {
    if (!data || !beneEditRef) { setBeneEditOpen(false); return; }
    try {
      const current = Array.isArray(data.policyBeneficiaries) ? data.policyBeneficiaries : [];
      const updated = updateLocalPolicyBeneficiaries(current, beneEditRef, beneEditDraft);
      const newCsv = rebuildBeneficiariesCSV(updated, beneficiariesCsv);

      const fd = new FormData();
      fd.set("policyBeneficiaries", JSON.stringify(updated));
      if (newCsv) fd.set("beneficiaries", newCsv);

      const res = await fetch(`/api/requests/${id}`, { method: "PUT", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Save failed");

      const r: RequestDetail = json.request;
      setData(r);
      setBeneEditOpen(false);
      setBeneEditRef(null);
      buildBeneficiaries(r);
      onUpdated?.(r);
    } catch (e: any) {
      alert(e?.message || "Could not save beneficiary");
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setMsg(null);
    try {
      const fd = new FormData();

      fd.set("fhRep", fhRep || "");
      fd.set("contactPhone", contactPhone || "");
      fd.set("contactEmail", contactEmail || "");

      fd.set("decFirstName", decFirstName || "");
      fd.set("decLastName", decLastName || "");
      if (decSSN) fd.set("decSSN", decSSN);
      if (decDOB) fd.set("decDOB", decDOB);
      if (decDOD) fd.set("decDOD", decDOD);
      fd.set("decMaritalStatus", decMaritalStatus || "");

      fd.set("decAddress", decAddress || "");
      fd.set("decCity", decCity || "");
      fd.set("decState", decState || "");
      fd.set("decZip", decZip || "");

      fd.set("decPODCity", decPODCity || "");
      fd.set("decPODState", decPODState || "");
      fd.set("decPODCountry", decPODCountry || "");
      if (deathInUS) fd.set("deathInUS", deathInUS);

      fd.set("codNatural",  cod === "Natural"  ? "Yes" : "No");
      fd.set("codAccident", cod === "Accident" ? "Yes" : "No");
      fd.set("codHomicide", cod === "Homicide" ? "Yes" : "No");
      fd.set("codPending",  cod === "Pending"  ? "Yes" : "No");
      if (hasFinalDC) fd.set("hasFinalDC", hasFinalDC);

      if (employerRelation) fd.set("employerRelation", employerRelation);
      if (employerPhone) fd.set("employerPhone", employerPhone);
      if (employerContact) fd.set("employerContact", employerContact);
      if (employerEmail) fd.set("employerEmail", employerEmail);
      if (employmentStatus) fd.set("employmentStatus", employmentStatus);

      if (policyNumbers) fd.set("policyNumbers", policyNumbers);
      if (faceAmount) fd.set("faceAmount", faceAmount);

      // keep CSV as-is (read-only here)
      if (beneficiariesCsv) fd.set("beneficiaries", beneficiariesCsv);

      if (totalServiceAmount) fd.set("totalServiceAmount", totalServiceAmount);
      if (familyAdvancementAmount) fd.set("familyAdvancementAmount", familyAdvancementAmount);
      if (vipFeeCalc) fd.set("vipFee", formatMoney(vipFeeCalc));
      if (assignmentAmountCalc) fd.set("assignmentAmount", formatMoney(assignmentAmountCalc));

      if (notes) fd.set("notes", notes);

      assignAdds.forEach(f => fd.append("assignmentUploads", f));
      otherAdds.forEach(f => fd.append("otherUploads", f));

      const res = await fetch(`/api/requests/${id}`, { method: "PUT", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Save failed (HTTP ${res.status})`);

      const r: RequestDetail = json.request;
      setData(r);
      setEditing(false);
      setAssignAdds([]);
      setOtherAdds([]);
      buildBeneficiaries(r);
      onUpdated?.(r);
    } catch (e: any) {
      setMsg(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const employerYes =
    !!(data?.employerRelation || data?.employerPhone || data?.employerContact || data?.employmentStatus || data?.employerEmail);

  // Build per-policy display rows
  const policyRows: Array<{
    index: number;
    policyNumber: string;
    faceAmount?: string;
    beneficiaries: Array<{ name: string; detail?: BeneficiaryDetail; pIdx?: number; bIdx?: number }>;
  }> = useMemo(() => {
    const rows: Array<{
      index: number;
      policyNumber: string;
      faceAmount?: string;
      beneficiaries: Array<{ name: string; detail?: BeneficiaryDetail; pIdx?: number; bIdx?: number }>;
    }> = [];
    if (!data) return rows;

    const structured = Array.isArray(data.policyBeneficiaries) && data.policyBeneficiaries.length > 0;
    const policyNums = structured
      ? (data.policies || []).map(p => (p?.policyNumber || "").trim())
      : (data.policyNumbers ?? "").split(",").map(s => s.trim()).filter(Boolean);

    const pb = Array.isArray(data.policyBeneficiaries) ? data.policyBeneficiaries : [];

    for (let i = 0; i < policyNums.length; i++) {
      const num = policyNums[i] || "";
      const face = (data.policies && data.policies[i]?.faceAmount) || undefined;

      const rowBenes: Array<{ name: string; detail?: BeneficiaryDetail; pIdx?: number; bIdx?: number }> = [];
      const details: BeneficiaryDetail[] = Array.isArray(pb[i]) ? pb[i] : [];
      if (details.length) {
        for (let j = 0; j < details.length; j++) {
          const ben = details[j];
          rowBenes.push({ name: (ben?.name || "").trim(), detail: ben, pIdx: i, bIdx: j });
        }
      } else if (data.beneficiaries) {
        (data.beneficiaries ?? "").split(",").map(s => s.trim()).filter(Boolean).forEach(n => rowBenes.push({ name: n }));
      }

      rows.push({ index: i, policyNumber: num, faceAmount: face, beneficiaries: rowBenes });
    }

    if (!policyNums.length && (data.beneficiaries || "")) {
      const rowBenes = (data.beneficiaries ?? "").split(",").map(s => s.trim()).filter(Boolean).map(n => ({ name: n }));
      rows.push({ index: 0, policyNumber: "", faceAmount: data.faceAmount || "", beneficiaries: rowBenes });
    }

    return rows;
  }, [data]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
      <div className="modal" style={{ maxWidth: "min(980px, 96vw)" }}>
        <div className="modal-header">
          <h3 id="request-modal-title">Funding Request {editing ? "— Edit" : "Details"}</h3>
          <div style={{ display: "flex", gap: 8 }}>
            {!editing && canEdit && (
              <button className="btn btn-gold" onClick={() => setEditing(true)}>Edit</button>
            )}
            {canDelete && !editing && (
              <button className="btn" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
            <button className="btn btn-ghost modal-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div className="modal-body">
          {loading && <p>Loading…</p>}
          {msg && <p className="error">{msg}</p>}

          {/* -------- VIEW MODE -------- */}
          {data && !loading && !msg && !editing && (
            <div className="detail-grid">
              {/* FH/CEM */}
              <section>
                <h4>Funeral Home / Cemetery</h4>
                <div className="kv"><span>FH/CEM Name</span><strong>{data.fhName || "—"}</strong></div>
                <div className="kv"><span>FH/CEM REP</span><strong>{data.fhRep || "—"}</strong></div>
                <div className="kv"><span>Contact Phone</span><strong>{data.contactPhone || "—"}</strong></div>
                <div className="kv"><span>Contact Email</span><strong>{data.contactEmail || "—"}</strong></div>
              </section>

              {/* Decedent */}
              <section>
                <h4>Decedent</h4>
                <div className="kv"><span>DEC Name</span><strong>{[data.decFirstName, data.decLastName].filter(Boolean).join(" ") || "—"}</strong></div>
                <div className="kv"><span>SSN</span><strong>{data.decSSN || "—"}</strong></div>
                <div className="kv"><span>Date of Birth</span><strong>{fmtDate(data.decDOB) || "—"}</strong></div>
                <div className="kv"><span>Date of Death</span><strong>{fmtDate(data.decDOD) || "—"}</strong></div>
                <div className="kv"><span>Marital Status</span><strong>{data.decMaritalStatus || "—"}</strong></div>
              </section>

              {/* Address */}
              <section>
                <h4>Address</h4>
                <div className="kv"><span>Street</span><strong>{data.decAddress || "—"}</strong></div>
                <div className="kv"><span>City</span><strong>{data.decCity || "—"}</strong></div>
                <div className="kv"><span>State</span><strong>{data.decState || "—"}</strong></div>
                <div className="kv"><span>Zip</span><strong>{data.decZip || "—"}</strong></div>
              </section>

              {/* Place of Death */}
              <section>
                <h4>Place of Death</h4>
                <div className="kv"><span>City</span><strong>{data.decPODCity || "—"}</strong></div>
                <div className="kv"><span>State</span><strong>{data.decPODState || "—"}</strong></div>
                <div className="kv">
                  <span>Country</span>
                  <strong>
                    {data.deathInUS === false ? (data.decPODCountry || "—")
                      : (data.deathInUS === true ? "United States" : (data.decPODCountry || "—"))}
                  </strong>
                </div>
                <div className="kv"><span>Cause of Death</span>
                  <strong>
                    {[
                      data.codNatural && "Natural",
                      data.codAccident && "Accident",
                      data.codHomicide && "Homicide",
                      data.codPending && "Pending",
                      data.codSuicide && "Suicide",
                    ].filter(Boolean).join(", ") || "—"}
                  </strong>
                </div>
                <div className="kv"><span>Final Death Certificate?</span><strong>{fmtBool(data.hasFinalDC)}</strong></div>
              </section>

              {/* Insurance */}
              <section>
                <h4>Insurance</h4>
                <div className="kv"><span>Company</span><strong>{companyDisplay(data) || "—"}</strong></div>
                <div className="kv"><span>Total Face Amount</span><strong>{data.faceAmount || "—"}</strong></div>
                <div className="kv"><span>Is the insurance through the deceased&apos;s employer?</span>
                  <strong>{employerYes ? "Yes" : "No"}</strong>
                </div>
              </section>

              {/* Employer */}
              {employerYes && (
                <section>
                  <h4>Employer</h4>
                  <div className="kv"><span>Relation</span><strong>{data.employerRelation || "—"}</strong></div>
                  <div className="kv"><span>Employer Contact Name</span><strong>{data.employerContact || "—"}</strong></div>
                  <div className="kv"><span>Employer Phone</span><strong>{data.employerPhone || "—"}</strong></div>
                  <div className="kv"><span>Employer Email</span><strong>{data.employerEmail || "—"}</strong></div>
                  <div className="kv"><span>Status</span><strong>{data.employmentStatus || "—"}</strong></div>
                </section>
              )}

              {/* Policies */}
              <section style={{ gridColumn: "1 / -1" }}>
                <h4>Policies</h4>
                {policyRows.length ? (
                  <div className="policies">
                    {policyRows.map(row => (
                      <div key={row.index} className="policy-card">
                        <div className="policy-head">
                          <strong>{`Policy #${row.index + 1}`}</strong>
                        </div>
                        <div className="policy-grid">
                          <div className="kv"><span>Policy Number</span><strong>{row.policyNumber || "—"}</strong></div>
                          <div className="kv"><span>Face Amount</span><strong>{row.faceAmount || "—"}</strong></div>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <span style={{ display: "block", marginBottom: 6 }}>Beneficiaries</span>
                          {row.beneficiaries.length ? (
                            <div className="bene-list">
                              {row.beneficiaries.map((b, i) => (
                                <div key={i} className="bene-row">
                                  <div className="bene-name">{b.name || "—"}</div>
                                  <button
                                    type="button"
                                    className="btn"
                                    onClick={() => { setBeneSelected(b); setBeneOpen(true); }}
                                  >
                                    View
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : <strong>—</strong>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <em>No policy information.</em>
                )}
              </section>

              {/* Financials */}
              <section>
                <h4>Financials</h4>
                <div className="kv"><span>Total Service Amount</span><strong>{data.totalServiceAmount || "—"}</strong></div>
                <div className="kv"><span>Family Advancement Amount</span><strong>{data.familyAdvancementAmount || "—"}</strong></div>
                <div className="kv"><span>VIP Fee</span><strong>{data.vipFee || "—"}</strong></div>
                <div className="kv"><span>Assignment Amount</span><strong>{data.assignmentAmount || "—"}</strong></div>
              </section>

              {/* Additional */}
              <section style={{ gridColumn: "1 / -1" }}>
                <h4>Additional</h4>
                <div className="kv">
                  <span>Notes</span>
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    <strong>{data.notes || "—"}</strong>
                  </div>
                </div>
              </section>

              {/* Attachments */}
              <section style={{ gridColumn: "1 / -1" }}>
                <h4>Attachments</h4>

                <div className="kv"><span>Assignment Files</span>
                  {data.assignmentUploadPaths?.length ? (
                    <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                      {data.assignmentUploadPaths.map((_, idx) => (
                        <a key={idx} className="btn" href={`/api/requests/${id}/assignment?i=${idx}`} target="_blank" rel="noopener">
                          Download Assignment #{idx + 1}
                        </a>
                      ))}
                    </div>
                  ) : data.assignmentUploadPath ? (
                    <a className="btn" href={`/api/requests/${id}/assignment`} target="_blank" rel="noopener">
                      Download Assignment
                    </a>
                  ) : (
                    <em>None</em>
                  )}
                </div>

                <div className="kv" style={{ marginTop: 8 }}><span>Other Documents</span>
                  {Array.isArray(data.otherUploadPaths) && data.otherUploadPaths.length > 0 ? (
                    <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                      {data.otherUploadPaths.map((_, idx) => (
                        <a
                          key={idx}
                          className="btn"
                          href={`/api/requests/${id}/other-docs/${idx}`}
                          target="_blank"
                          rel="noopener"
                        >
                          Download Document #{idx + 1}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <em>None</em>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* -------- EDIT MODE -------- */}
          {data && !loading && !msg && editing && (
            <form onSubmit={onSave} className="edit-grid">
              {/* FH/CEM */}
              <section>
                <h4>Funeral Home / Cemetery</h4>
                <label>FH/CEM Name (read-only)
                  <input type="text" value={data.fhName || ""} readOnly />
                </label>
                <label>FH/CEM REP
                  <input type="text" value={fhRep} onChange={(e)=>setFhRep(e.target.value)} />
                </label>
                <label>Contact Phone
                  <input type="tel" value={contactPhone} onChange={(e)=>setContactPhone(formatPhone(e.target.value))} placeholder="(555) 555-5555" />
                </label>
                <label>Contact Email
                  <input type="email" value={contactEmail} onChange={(e)=>setContactEmail(e.target.value)} placeholder="name@example.com" />
                </label>
              </section>

              {/* Decedent */}
              <section>
                <h4>Decedent</h4>
                <div className="grid2">
                  <label>DEC First Name
                    <input type="text" value={decFirstName} onChange={(e)=>setDecFirstName(e.target.value)} required />
                  </label>
                  <label>DEC Last Name
                    <input type="text" value={decLastName} onChange={(e)=>setDecLastName(e.target.value)} required />
                  </label>
                </div>
                <div className="grid3">
                  <label>SSN
                    <input type="text" value={decSSN || ""} onChange={(e)=>setDecSSN(formatSSN(e.target.value))} placeholder="###-##-####" maxLength={11} />
                  </label>
                  <label>Date of Birth
                    <input type="date" value={decDOB} onChange={(e)=>setDecDOB(e.target.value)} />
                  </label>
                  <label>Date of Death
                    <input type="date" value={decDOD} onChange={(e)=>setDecDOD(e.target.value)} />
                  </label>
                </div>
                <label>Marital Status
                  <select value={decMaritalStatus} onChange={(e)=>setDecMaritalStatus(e.target.value)}>
                    <option value="">— Select —</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Separated">Separated</option>
                  </select>
                </label>
              </section>

              {/* Address */}
              <section>
                <h4>Address</h4>
                <label>Street
                  <input type="text" value={decAddress} onChange={(e)=>setDecAddress(e.target.value)} />
                </label>
                <div className="grid3">
                  <label>City
                    <input type="text" value={decCity} onChange={(e)=>setDecCity(e.target.value)} />
                  </label>
                  <label>State
                    <input type="text" value={decState} onChange={(e)=>setDecState(e.target.value)} />
                  </label>
                  <label>Zip
                    <input type="text" value={decZip} onChange={(e)=>setDecZip(e.target.value)} />
                  </label>
                </div>
              </section>

              {/* Place of Death */}
              <section>
                <h4>Place of Death</h4>
                <div className="grid2">
                  <label>City
                    <input type="text" value={decPODCity} onChange={(e)=>setDecPODCity(e.target.value)} />
                  </label>
                  <label>State
                    <input type="text" value={decPODState} onChange={(e)=>setDecPODState(e.target.value)} />
                  </label>
                </div>
                <div className="grid2">
                  <label>Was the Death in the U.S.?
                    <select value={deathInUS} onChange={(e)=>setDeathInUS(e.target.value as any)}>
                      <option value="">— Select —</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </label>
                  <label>Cause of Death
                    <select value={cod} onChange={(e)=>setCod(e.target.value as any)}>
                      <option value="">— Select —</option>
                      <option value="Natural">Natural</option>
                      <option value="Accident">Accident</option>
                      <option value="Homicide">Homicide</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </label>
                </div>
                {deathInUS === "No" && (
                  <label>Country
                    <input type="text" value={decPODCountry} onChange={(e)=>setDecPODCountry(e.target.value)} />
                  </label>
                )}
                <label>Do you have the Final Death Certificate?
                  <select value={hasFinalDC} onChange={(e)=>setHasFinalDC(e.target.value as any)}>
                    <option value="">— Select —</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </label>
              </section>

              {/* Insurance */}
              <section>
                <h4>Insurance</h4>
                <label>Company (read-only)</label>
                <div className="readline">{companyDisplay(data)}</div>
                <label>Total Face Amount (formatted)
                  <input type="text" value={faceAmount} onChange={(e)=>setFaceAmount(e.target.value)} placeholder="$0.00" />
                </label>
                <label>Policy Number(s)
                  <input type="text" value={policyNumbers} onChange={(e)=>setPolicyNumbers(e.target.value)} placeholder="Comma-separated if multiple" />
                </label>

                {/* Beneficiaries read-only list with per-item Edit */}
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Beneficiaries</div>
                  {Array.isArray(data.policyBeneficiaries) && data.policyBeneficiaries.length > 0 ? (
                    <div className="list">
                      {data.policyBeneficiaries.map((row, pIdx) => (
                        <div key={pIdx} style={{ display: "grid", gap: 6 }}>
                          {row.map((ben, bIdx) => (
                            <div key={bIdx} className="bene-row">
                              <div className="bene-name">{(ben?.name || "").trim() || "—"}</div>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => openBeneficiaryEdit(pIdx, bIdx, ben)}
                              >
                                Edit
                              </button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="readline" style={{ marginTop: 4 }}>
                        {(data.beneficiaries ?? "—")}
                      </div>
                      <small className="muted">
                        Beneficiaries are not yet structured; editing requires structured beneficiary details.
                      </small>
                    </>
                  )}
                </div>
              </section>

              {/* Financials */}
              <section>
                <h4>Financials</h4>
                <div className="grid3">
                  <label>Total Service Amount
                    <input type="text" value={totalServiceAmount} onChange={(e)=>setTotalServiceAmount(e.target.value)} placeholder="$0.00" />
                  </label>
                  <label>Family Advancement Amount
                    <input type="text" value={familyAdvancementAmount} onChange={(e)=>setFamilyAdvancementAmount(e.target.value)} placeholder="$0.00" />
                  </label>
                  <label>VIP Fee (auto)
                    <input type="text" value={formatMoney(vipFeeCalc)} readOnly className="readonly" />
                  </label>
                </div>
                <label>Total Assignment (auto)
                  <input type="text" value={formatMoney(assignmentAmountCalc)} readOnly className="readonly" />
                </label>
              </section>

              {/* Additional */}
              <section>
                <h4>Additional</h4>
                <textarea rows={3} value={notes} onChange={(e)=>setNotes(e.target.value)} />
              </section>

              {/* Existing + Add uploads */}
              <section>
                <h4>Existing Attachments</h4>
                <div><span>Assignments</span>
                  {data.assignmentUploadPaths?.length ? (
                    <div className="list">
                      {data.assignmentUploadPaths.map((_, idx) => (
                        <a key={idx} className="btn" href={`/api/requests/${id}/assignment?i=${idx}`} target="_blank" rel="noopener">
                          Download Assignment #{idx + 1}
                        </a>
                      ))}
                    </div>
                  ) : data.assignmentUploadPath ? (
                    <a className="btn" href={`/api/requests/${id}/assignment`} target="_blank" rel="noopener">Download Assignment</a>
                  ) : <em>None</em>}
                </div>
                <div style={{ marginTop: 8 }}><span>Other Documents</span>
                  {Array.isArray(data.otherUploadPaths) && data.otherUploadPaths.length > 0 ? (
                    <div className="list">
                      {data.otherUploadPaths.map((_, idx) => (
                        <a key={idx} className="btn" href={`/api/requests/${id}/other-docs/${idx}`} target="_blank" rel="noopener">
                          Download Document #{idx + 1}
                        </a>
                      ))}
                    </div>
                  ) : <em>None</em>}
                </div>
              </section>

              {/* Add New Assignment Files */}
              <section>
                <h4>Upload Assignments (add)</h4>
                <input
                  ref={assignInputRef}
                  type="file"
                  multiple
                  accept={FILE_ACCEPT}
                  onChange={(e) => {
                    const incoming = Array.from(e.currentTarget.files || []);
                    const space = Math.max(0, MAX_ASSIGNMENT_UPLOADS - normalizedAssignCount - assignAdds.length);
                    if (space > 0) setAssignAdds(prev => [...prev, ...incoming.slice(0, space)]);
                    (e.currentTarget as HTMLInputElement).value = "";
                  }}
                  style={{ display: "none" }}
                />
                <div
                  className={`dz ${assignOver ? "over" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDragEnter={(e) => { e.preventDefault(); setAssignOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setAssignOver(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setAssignOver(false);
                    const incoming = Array.from(e.dataTransfer.files || []);
                    const space = Math.max(0, MAX_ASSIGNMENT_UPLOADS - normalizedAssignCount - assignAdds.length);
                    if (space > 0) setAssignAdds(prev => [...prev, ...incoming.slice(0, space)]);
                  }}
                  onClick={() => assignInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <div>
                    <strong>Drag & drop assignment file(s) or click to browse</strong>
                    <div style={{ marginTop: 6 }}>
                      <button type="button" className="btn-link" onClick={() => assignInputRef.current?.click()}>
                        Browse files
                      </button>
                    </div>
                    <small>Existing: {normalizedAssignCount}. You can add up to {Math.max(0, MAX_ASSIGNMENT_UPLOADS - normalizedAssignCount)} more. Max 500MB each.</small>
                  </div>
                </div>
                {assignAdds.length > 0 && (
                  <div className="file-list" aria-live="polite">
                    {assignAdds.map((f, idx) => (
                      <div key={idx} className="file-row">
                        <span className="file-name">{idx + 1}. {f.name}</span>
                        <button type="button" className="btn-link" onClick={() => setAssignAdds(prev => prev.filter((_, i) => i !== idx))}>
                          Remove
                        </button>
                      </div>
                    ))}
                    <small>{assignAdds.length} pending upload(s)</small>
                  </div>
                )}
              </section>

              {/* Add New Other Documents */}
              <section>
                <h4>Upload Other Documents (add)</h4>
                <input
                  ref={otherInputRef}
                  type="file"
                  multiple
                  accept={FILE_ACCEPT}
                  onChange={(e) => {
                    const incoming = Array.from(e.currentTarget.files || []);
                    const existing = data.otherUploadPaths?.length || 0;
                    const space = Math.max(0, MAX_OTHER_UPLOADS - existing - otherAdds.length);
                    if (space > 0) setOtherAdds(prev => [...prev, ...incoming.slice(0, space)]);
                    (e.currentTarget as HTMLInputElement).value = "";
                  }}
                  style={{ display: "none" }}
                />
                <div
                  className={`dz ${otherOver ? "over" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDragEnter={(e) => { e.preventDefault(); setOtherOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setOtherOver(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOtherOver(false);
                    const incoming = Array.from(e.dataTransfer.files || []);
                    const existing = data.otherUploadPaths?.length || 0;
                    const space = Math.max(0, MAX_OTHER_UPLOADS - existing - otherAdds.length);
                    if (space > 0) setOtherAdds(prev => [...prev, ...incoming.slice(0, space)]);
                  }}
                  onClick={() => otherInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <div>
                    <strong>Drag & drop other document(s) or click to browse</strong>
                    <div style={{ marginTop: 6 }}>
                      <button type="button" className="btn-link" onClick={() => otherInputRef.current?.click()}>
                        Browse files
                      </button>
                    </div>
                    <small>Existing: {data.otherUploadPaths?.length || 0}. You can add up to {Math.max(0, MAX_OTHER_UPLOADS - (data.otherUploadPaths?.length || 0))} more. Max 500MB each.</small>
                  </div>
                </div>
                {otherAdds.length > 0 && (
                  <div className="file-list" aria-live="polite">
                    {otherAdds.map((f, idx) => (
                      <div key={idx} className="file-row">
                        <span className="file-name">{idx + 1}. {f.name}</span>
                        <button type="button" className="btn-link" onClick={() => setOtherAdds(prev => prev.filter((_, i) => i !== idx))}>
                          Remove
                        </button>
                      </div>
                    ))}
                    <small>{otherAdds.length} pending upload(s)</small>
                  </div>
                )}
              </section>

              <div className="form-actions">
                <button className="btn" type="button" onClick={() => { setEditing(false); setAssignAdds([]); setOtherAdds([]); }}>Cancel</button>
                <button className="btn btn-gold" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>

        {!editing && (
          <div className="modal-footer">
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        )}
      </div>

      {/* Beneficiary view modal */}
      {beneOpen && beneSelected && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="bene-title">
          <div className="modal" style={{ maxWidth: "min(760px, 94vw)" }}>
            <div className="modal-header">
              <h3 id="bene-title">Beneficiary Info</h3>
              <button className="btn btn-ghost modal-close" onClick={() => setBeneOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid" style={{ gridTemplateColumns: "1fr" }}>
                <section>
                  <h4>Basic</h4>
                  <div className="kv"><span>Name</span><strong>{beneSelected.name || "—"}</strong></div>
                  <div className="kv"><span>Relationship</span><strong>{beneSelected.detail?.relationship || "—"}</strong></div>
                  <div className="kv"><span>DOB</span><strong>{beneSelected.detail?.dob || "—"}</strong></div>
                  <div className="kv"><span>SSN</span><strong>{beneSelected.detail?.ssn || "—"}</strong></div>
                </section>
                <section>
                  <h4>Contact</h4>
                  <div className="kv"><span>Phone</span><strong>{beneSelected.detail?.phone || "—"}</strong></div>
                  <div className="kv"><span>Email</span><strong>{beneSelected.detail?.email || "—"}</strong></div>
                </section>
                <section>
                  <h4>Address</h4>
                  <div className="kv"><span>Street</span><strong>{beneSelected.detail?.address || "—"}</strong></div>
                  <div className="grid3">
                    <div className="kv"><span>City</span><strong>{beneSelected.detail?.city || "—"}</strong></div>
                    <div className="kv"><span>State</span><strong>{beneSelected.detail?.state || "—"}</strong></div>
                    <div className="kv"><span>Zip</span><strong>{beneSelected.detail?.zip || "—"}</strong></div>
                  </div>
                </section>
              </div>
              {!beneSelected.detail || Object.values(beneSelected.detail).filter(Boolean).length <= 1 ? (
                <p className="muted" style={{ marginTop: 12 }}>
                  No additional details on file for this beneficiary.
                </p>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setBeneOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Beneficiary edit modal */}
      {beneEditOpen && beneEditRef && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="bene-edit-title">
          <div className="modal" style={{ maxWidth: "min(760px, 94vw)" }}>
            <div className="modal-header">
              <h3 id="bene-edit-title" className="modal-title">Edit Beneficiary</h3>
              <button className="btn btn-ghost modal-close" onClick={() => setBeneEditOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid" style={{ gridTemplateColumns: "1fr" }}>
                <section>
                  <h4>Basic</h4>
                  <label>Name
                    <input
                      type="text"
                      value={beneEditDraft.name || ""}
                      onChange={(e)=>setBeneEditDraft({ ...beneEditDraft, name: e.target.value })}
                      placeholder="Full name"
                    />
                  </label>
                  <label>Relationship
                    <input
                      type="text"
                      value={beneEditDraft.relationship || ""}
                      onChange={(e)=>setBeneEditDraft({ ...beneEditDraft, relationship: e.target.value })}
                      placeholder="e.g., Spouse, Child"
                    />
                  </label>
                  <div className="grid3">
                    <label>DOB
                      <input
                        type="date"
                        value={beneEditDraft.dob || ""}
                        onChange={(e)=>setBeneEditDraft({ ...beneEditDraft, dob: e.target.value })}
                      />
                    </label>
                    <label>SSN
                      <input
                        type="text"
                        value={beneEditDraft.ssn || ""}
                        onChange={(e)=>setBeneEditDraft({ ...beneEditDraft, ssn: e.target.value })}
                        placeholder="###-##-####"
                        maxLength={11}
                      />
                    </label>
                  </div>
                </section>

                <section>
                  <h4>Contact</h4>
                  <div className="grid2">
                    <label>Phone
                      <input
                        type="tel"
                        value={beneEditDraft.phone || ""}
                        onChange={(e)=>setBeneEditDraft({ ...beneEditDraft, phone: e.target.value })}
                        placeholder="(555) 555-5555"
                      />
                    </label>
                    <label>Email
                      <input
                        type="email"
                        value={beneEditDraft.email || ""}
                        onChange={(e)=>setBeneEditDraft({ ...beneEditDraft, email: e.target.value })}
                        placeholder="name@example.com"
                      />
                    </label>
                  </div>
                </section>

                <section>
                  <h4>Address</h4>
                  <label>Street
                    <input
                      type="text"
                      value={beneEditDraft.address || ""}
                      onChange={(e)=>setBeneEditDraft({ ...beneEditDraft, address: e.target.value })}
                    />
                  </label>
                  <div className="grid3">
                    <label>City
                      <input
                        type="text"
                        value={beneEditDraft.city || ""}
                        onChange={(e)=>setBeneEditDraft({ ...beneEditDraft, city: e.target.value })}
                      />
                    </label>
                    <label>State
                      <input
                        type="text"
                        value={beneEditDraft.state || ""}
                        onChange={(e)=>setBeneEditDraft({ ...beneEditDraft, state: e.target.value })}
                      />
                    </label>
                    <label>Zip
                      <input
                        type="text"
                        value={beneEditDraft.zip || ""}
                        onChange={(e)=>setBeneEditDraft({ ...beneEditDraft, zip: e.target.value })}
                      />
                    </label>
                  </div>
                </section>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setBeneEditOpen(false)}>Cancel</button>
              <button className="btn btn-gold" onClick={saveBeneficiaryEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .detail-grid, .edit-grid {
          display: grid; gap: 14px;
          grid-template-columns: repeat(2, minmax(260px, 1fr));
        }
        @media (max-width: 900px) {
          .detail-grid, .edit-grid { grid-template-columns: 1fr; }
        }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: grid; place-items: center; z-index: 50; }
        .modal { background: var(--modal-bg, #0b0d0f); border: 1px solid var(--border, #1a1c1f); border-radius: 0; width: min(980px, 96vw); max-height: 92vh; overflow: auto; }
        .modal-header { display:flex; align-items:center; justify-content:space-between; padding: 12px; border-bottom: 1px solid var(--border, #1a1c1f); }
        .modal-body { padding: 12px; }
        .modal-footer { padding: 12px; border-top: 1px solid var(--border, #1a1c1f); display:flex; justify-content:flex-end; gap:8px; }

        section { border: 1px solid var(--border, #1a1c1f); padding: 12px; background: var(--card-bg, #0b0d0f); }
        h4 { margin: 0 0 8px; color: var(--title, #d6b16d); font-weight: 800; }
        .error { color: crimson; }

        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }

        label { display: grid; gap: 4px; }
        input, select, textarea {
          width: 100%; padding: 8px 10px; border: 1px solid var(--field-border, #1a1c1f);
          border-radius: 0; background: var(--field-bg, #121416); color: #fff;
        }

        .readonly { background: rgba(255,255,255,.08); }
        .readline { padding: 8px 10px; border: 1px dashed var(--border, #1a1c1f); }

        .list { display: grid; gap: 6px; margin-top: 6px; }
        .dz { border: 1px dashed var(--border, #1a1c1f); background: var(--field-bg, #121416); padding: 14px; display: grid; place-items: center; text-align: center; cursor: pointer; }
        .dz.over { outline: 2px dashed var(--gold, #d6b16d); outline-offset: 2px; }

        .btn { border: 1px solid var(--border, #1a1c1f); background: var(--btn-bg, #121416); color:#fff; padding:8px 10px; border-radius:0; cursor:pointer; }
        .btn-gold { background: var(--gold, #d6b16d); border-color: var(--gold, #d6b16d); color:#000; }
        .btn-link { background: transparent; border: 1px solid var(--border, #1a1c1f); padding: 4px 8px; cursor: pointer; }

        .file-list { display: grid; gap: 6px; margin-top: 8px; }
        .file-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .form-actions { display: flex; justify-content: flex-end; gap: 8px; }

        .bene-list { display: grid; gap: 8px; margin-top: 6px; }
        .bene-row { display:flex; align-items:center; justify-content:space-between; gap:8px; border: 1px solid var(--border, #1a1c1f); padding: 6px 8px; }
        .bene-name { font-weight: 700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        .policies { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .policy-card { border: 1px solid var(--border, #1a1c1f); background: var(--card-bg, #0b0d0f); padding: 10px; width: 100%; }
        .policy-head { display: flex; align-items: center; justify-content: space-between; }
        .policy-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        @media (max-width: 700px) { .policy-grid { grid-template-columns: 1fr; } }
        .policy-card * { word-break: break-word; min-width: 0; }

        .kv > span { margin-right: 6px; display: inline-block; }
        .grid3 .kv > span { margin-right: 6px; }

        @media (prefers-color-scheme: light) {
          .modal { background: #F7F7FB; border-color: #d0d5dd; }
          section { background: #ffffff; border-color: #d0d5dd; }
          h4 { color: #000000; }
          .readline { background: #ffffff; border-color: #d0d5dd; color: #000; }
          input, select, textarea { background: #ffffff; color: #000; border-color: #d0d5dd; }
          .dz { background: #ffffff; border-color: #d0d5dd; }
          .btn, .btn-ghost, .btn-link { background: #F2F4F6; color: #000; border-color: #d0d5dd; }
          .modal-header, .modal-footer { border-color: #d0d5dd; }
          .bene-row, .policy-card { border-color: #d0d5dd; background: #ffffff; }
        }
      `}</style>
    </div>
  );
}
