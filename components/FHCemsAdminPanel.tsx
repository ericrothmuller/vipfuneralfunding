// components/FHCemsAdminPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type FHCem = {
  _id: string;
  name: string;
  reps?: string[];
  phone?: string;
  email?: string;
  fax?: string;
  mailingAddress?: string;
  notes?: string;
};

type FundingRequest = {
  _id: string;
  decedentFirstName?: string;
  decedentLastName?: string;
  status?: string;
  createdAt?: string;
  ownerId?: string;
};

type LinkReq = {
  _id: string;
  requestedName: string;
  status: "Pending" | "Approved" | "Rejected";
  userId: {
    _id: string;
    email: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
  };
  createdAt?: string;
};

export default function FHCemsAdminPanel() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<FHCem[]>([]);
  const [selected, setSelected] = useState<FHCem | null>(null);
  const [requests, setRequests] = useState<LinkReq[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [edit, setEdit] = useState<FHCem | null>(null);
  const [saving, setSaving] = useState(false);
  const [requestsForSelected, setRequestsForSelected] = useState<FundingRequest[]>([]);
  const [loadingFR, setLoadingFR] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/fhcems?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    const data = await res.json();
    setItems(data.items || []);
  }

  async function loadLinkRequests() {
    setRequestsLoading(true);
    try {
      const res = await fetch(`/api/admin/fhcem-link-requests`, { cache: "no-store" });
      const data = await res.json();
      setRequests(data.items || []);
    } finally {
      setRequestsLoading(false);
    }
  }

  async function loadSelectedFR(fhId: string) {
    setLoadingFR(true);
    try {
      const res = await fetch(`/api/admin/fhcems/${fhId}/requests`, { cache: "no-store" });
      const data = await res.json();
      setRequestsForSelected(data.items || []);
    } finally {
      setLoadingFR(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { const id = setTimeout(load, 300); return () => clearTimeout(id); }, [q]);
  useEffect(() => { loadLinkRequests(); }, []);

  useEffect(() => {
    if (selected?._id) loadSelectedFR(selected._id);
    else setRequestsForSelected([]);
  }, [selected?._id]);

  async function onSave() {
    if (!edit) return;
    setSaving(true);
    try {
      const payload = {
        name: edit.name,
        reps: edit.reps || [],
        phone: edit.phone || "",
        email: edit.email || "",
        fax: edit.fax || "",
        mailingAddress: edit.mailingAddress || "",
        notes: edit.notes || "",
      };
      const res = await fetch(edit._id ? `/api/admin/fhcems/${edit._id}` : `/api/admin/fhcems`, {
        method: edit._id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      setEdit(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete FH/CEM?")) return;
    const res = await fetch(`/api/admin/fhcems/${id}`, { method: "DELETE" });
    if (!res.ok) return alert("Delete failed");
    if (selected?._id === id) setSelected(null);
    await load();
  }

  async function onApprove(linkRequestId: string, fhCemId: string) {
    const res = await fetch(`/api/admin/fhcem-link-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkRequestId, action: "approve", fhCemId }),
    });
    if (!res.ok) return alert("Approval failed");
    await loadLinkRequests();
  }

  async function onReject(linkRequestId: string) {
    const res = await fetch(`/api/admin/fhcem-link-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkRequestId, action: "reject" }),
    });
    if (!res.ok) return alert("Rejection failed");
    await loadLinkRequests();
  }

  return (
    <div className="fhcems-wrap">
      <style jsx>{`
        .fhcems-wrap { display: grid; gap: 14px; }
        .row { display: grid; gap: 12px; grid-template-columns: 1fr; }
        @media (min-width: 900px) { .row { grid-template-columns: 320px 1fr; } }

        .card { background: var(--card-bg, #0b0d0f); border: 1px solid var(--border, #1a1c1f); padding: 12px; border-radius: 0; }
        .title { color: var(--gold, #d6b16d); font-weight: 800; margin: 0 0 8px; }
        .muted { color: var(--muted, #e0e0e0); }
        input, textarea { width: 100%; border: 1px solid var(--border, #1a1c1f); background: var(--field, #121416); color: #fff; padding: 8px 10px; border-radius: 0; }
        @media (prefers-color-scheme: light) { input, textarea { color: #000; background: #f6f6f6; border-color: #d0d0d0; } }
        .grid2 { display: grid; gap: 8px; grid-template-columns: 1fr 1fr; }
        @media (max-width: 700px){ .grid2 { grid-template-columns: 1fr; } }
        .list { display: grid; gap: 6px; }
        .item { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px; border: 1px solid var(--border, #1a1c1f); }
        .btn { border: 1px solid var(--border, #1a1c1f); background: var(--field, #121416); color:#fff; padding: 8px 10px; border-radius:0; cursor:pointer; }
        .btn-gold { background: var(--gold, #d6b16d); border-color: var(--gold, #d6b16d); color:#000; }
        .tabs { display:flex; gap:8px; flex-wrap: wrap; }
        .pill { border:1px solid var(--border, #1a1c1f); padding:6px 10px; cursor:pointer; }
        .pill.active { background: var(--gold, #d6b16d); color:#000; border-color: var(--gold, #d6b16d); }
        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td { border-bottom: 1px solid var(--border, #1a1c1f); padding: 8px; text-align: left; }
      `}</style>

      <div className="row">
        {/* Left: FH/CEM list + search */}
        <div className="card">
          <h3 className="title">FH/CEMs</h3>
          <input placeholder="Search…" value={q} onChange={(e)=>setQ(e.target.value)} />
          <div className="list" style={{ marginTop: 8 }}>
            <button className="btn btn-gold" onClick={()=>setEdit({ _id: "", name: "" } as any)}>+ New FH/CEM</button>
            {items.map(i => (
              <div key={i._id} className="item">
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontWeight: 700 }}>{i.name}</div>
                  <div className="muted" style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {i.phone || i.email || i.fax || i.mailingAddress ? [i.phone, i.email, i.fax, i.mailingAddress].filter(Boolean).join(" • ") : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn" onClick={()=>setSelected(i)}>Open</button>
                  <button className="btn" onClick={()=>setEdit(i)}>Edit</button>
                  <button className="btn" onClick={()=>onDelete(i._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Selected FH/CEM details + Funding Requests */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <h3 className="title">{selected ? selected.name : "Select an FH/CEM"}</h3>
            {selected && <button className="btn" onClick={()=>setSelected(null)}>Close</button>}
          </div>

          {!selected ? (
            <p className="muted">Choose an FH/CEM on the left to view details and funding requests.</p>
          ) : (
            <>
              <div className="grid2">
                <div>
                  <label>Phone</label>
                  <input value={selected.phone || ""} onChange={(e)=>setSelected({ ...selected, phone: e.target.value })} readOnly />
                </div>
                <div>
                  <label>Email</label>
                  <input value={selected.email || ""} onChange={(e)=>setSelected({ ...selected, email: e.target.value })} readOnly />
                </div>
                <div>
                  <label>Fax</label>
                  <input value={selected.fax || ""} onChange={(e)=>setSelected({ ...selected, fax: e.target.value })} readOnly />
                </div>
                <div>
                  <label>Reps (comma separated)</label>
                  <input value={(selected.reps || []).join(", ")} onChange={()=>{}} readOnly />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label>Mailing Address</label>
                  <textarea rows={2} value={selected.mailingAddress || ""} onChange={()=>{}} readOnly />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label>Notes</label>
                  <textarea rows={3} value={selected.notes || ""} onChange={()=>{}} readOnly />
                </div>
              </div>

              <h4 className="title" style={{ marginTop: 16 }}>Funding Requests</h4>
              {loadingFR ? (
                <p className="muted">Loading…</p>
              ) : !requestsForSelected.length ? (
                <p className="muted">No funding requests found for this FH/CEM (based on linked users).</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Decedent</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestsForSelected.map(r => (
                        <tr key={r._id}>
                          <td>{[r.decedentFirstName, r.decedentLastName].filter(Boolean).join(" ") || "—"}</td>
                          <td>{r.status || "—"}</td>
                          <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Link Requests */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <h3 className="title">FH/CEM Link Requests</h3>
          <button className="btn" onClick={loadLinkRequests} disabled={requestsLoading}>
            {requestsLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {!requests.length ? (
          <p className="muted">No pending link requests.</p>
        ) : (
          <div className="list" style={{ marginTop: 8 }}>
            {requests.map(lr => (
              <div key={lr._id} className="item" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{lr.requestedName}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    Requested by: {lr.userId?.contactName || lr.userId?.email} • {lr.userId?.email}
                    <br/>
                    Phone: {lr.userId?.contactPhone || "—"} • Email: {lr.userId?.contactEmail || "—"}
                  </div>
                </div>
                <div style={{ display: "grid", gap: 6, minWidth: 240 }}>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span className="muted" style={{ fontSize: 12 }}>Link to FH/CEM</span>
                    <select
                      onChange={(e)=> (lr as any)._approveTarget = e.target.value}
                      defaultValue=""
                      style={{ padding: 8, border: "1px solid var(--border, #1a1c1f)", background: "var(--field, #121416)", color: "#fff", borderRadius: 0 }}
                    >
                      <option value="" disabled>Select FH/CEM…</option>
                      {items.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
                    </select>
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-gold" onClick={()=>{
                      const t = (lr as any)._approveTarget;
                      if (!t) return alert("Choose an FH/CEM to link");
                      onApprove(lr._id, t);
                    }}>Approve</button>
                    <button className="btn" onClick={()=>onReject(lr._id)}>Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create Modal (lightweight inline) */}
      {edit && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"grid", placeItems:"center", zIndex: 50 }}>
          <div className="card" style={{ width:"min(720px, 96vw)", maxHeight:"90vh", overflow:"auto" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
              <h3 className="title">{edit._id ? "Edit FH/CEM" : "New FH/CEM"}</h3>
              <button className="btn" onClick={()=>setEdit(null)}>Close</button>
            </div>
            <div className="grid2">
              <div style={{ gridColumn: "1 / -1" }}>
                <label>FH/CEM Name</label>
                <input value={edit.name || ""} onChange={(e)=>setEdit({ ...edit, name: e.target.value })} />
              </div>
              <div>
                <label>Phone</label>
                <input value={edit.phone || ""} onChange={(e)=>setEdit({ ...edit, phone: e.target.value })} />
              </div>
              <div>
                <label>Email</label>
                <input value={edit.email || ""} onChange={(e)=>setEdit({ ...edit, email: e.target.value })} />
              </div>
              <div>
                <label>Fax</label>
                <input value={edit.fax || ""} onChange={(e)=>setEdit({ ...edit, fax: e.target.value })} />
              </div>
              <div>
                <label>Reps (comma separated)</label>
                <input
                  value={(edit.reps || []).join(", ")}
                  onChange={(e)=>setEdit({ ...edit, reps: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) })}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Mailing Address</label>
                <textarea rows={2} value={edit.mailingAddress || ""} onChange={(e)=>setEdit({ ...edit, mailingAddress: e.target.value })} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Notes</label>
                <textarea rows={3} value={edit.notes || ""} onChange={(e)=>setEdit({ ...edit, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <button className="btn" onClick={()=>setEdit(null)}>Cancel</button>
              <button className="btn btn-gold" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
