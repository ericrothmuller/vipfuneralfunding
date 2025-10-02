// components/FHCemsAdminPanel.tsx
"use client";

import { useEffect, useState } from "react";

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

  const [editingSelected, setEditingSelected] = useState(false);
  const [draft, setDraft] = useState<FHCem | null>(null);
  const [savingSelected, setSavingSelected] = useState(false);

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
    if (selected?._id) {
      setEditingSelected(false);
      setDraft(selected);
      loadSelectedFR(selected._id);
    } else {
      setEditingSelected(false);
      setDraft(null);
      setRequestsForSelected([]);
    }
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
      const { item } = await res.json();

      setEdit(null);

      setItems(prev => {
        const idx = prev.findIndex(x => x._id === item._id);
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = item;
          return next;
        }
        return [item, ...prev];
      });

      setSelected(prev => (prev && prev._id === item._id ? item : prev));
      setDraft(prev => (prev && prev._id === item._id ? item : prev));
    } finally {
      setSaving(false);
    }
  }

  async function onSaveSelected() {
    if (!draft || !selected) return;
    setSavingSelected(true);
    try {
      const payload = {
        name: draft.name,
        reps: draft.reps || [],
        phone: draft.phone || "",
        email: draft.email || "",
        fax: draft.fax || "",
        mailingAddress: draft.mailingAddress || "",
        notes: draft.notes || "",
      };
      const res = await fetch(`/api/admin/fhcems/${selected._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      const { item } = await res.json();

      setItems(prev => prev.map(x => (x._id === item._id ? item : x)));
      setSelected(item);
      setDraft(item);
      setEditingSelected(false);
    } catch (e: any) {
      alert(e?.message || "Save failed");
    } finally {
      setSavingSelected(false);
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

  const repsString = (editingSelected ? draft?.reps : selected?.reps)?.join(", ") || "";
  function setRepsFromString(s: string) {
    const list = s.split(",").map(x => x.trim()).filter(Boolean);
    if (editingSelected && draft) setDraft({ ...draft, reps: list });
  }

  return (
    <div className="fhcems-wrap grid gap-14">
      <div className="fhcems-layout">
        {/* Left list */}
        <div className="card grid gap-8">
          <h3 className="title">FH/CEMs</h3>
          <input placeholder="Search…" value={q} onChange={(e)=>setQ(e.target.value)} />
          <div className="list grid gap-6 mt-8">
            <button className="btn btn-gold" onClick={()=>setEdit({ _id: "", name: "" } as any)}>+ New FH/CEM</button>
            {items.map(i => (
              <div key={i._id} className="item flex items-center justify-between gap-8 p-8 bordered">
                <div className="overflow-hidden">
                  <div className="fw-700">{i.name}</div>
                  <div className="muted text-13 ellipsis">
                    {i.phone || i.email || i.fax || i.mailingAddress ? [i.phone, i.email, i.fax, i.mailingAddress].filter(Boolean).join(" • ") : "—"}
                  </div>
                </div>
                <div className="flex gap-6">
                  <button className="btn" onClick={()=>setSelected(i)}>Open</button>
                  <button className="btn" onClick={()=>setEdit(i)}>Edit</button>
                  <button className="btn" onClick={()=>onDelete(i._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right detail */}
        <div className="card">
          <div className="flex items-center justify-between gap-8">
            <h3 className="title">{selected ? selected.name : "Select an FH/CEM"}</h3>
            {selected && (
              <div className="flex gap-6">
                {!editingSelected ? (
                  <>
                    <button className="btn" onClick={()=>{ setDraft(selected); setEditingSelected(true); }}>Edit</button>
                    <button className="btn" onClick={()=>setSelected(null)}>Close</button>
                  </>
                ) : (
                  <>
                    <button className="btn" onClick={() => { setDraft(selected); setEditingSelected(false); }}>Cancel</button>
                    <button className="btn btn-gold" onClick={onSaveSelected} disabled={savingSelected}>
                      {savingSelected ? "Saving…" : "Save"}
                    </button>
                    <button className="btn" onClick={()=>setSelected(null)} disabled={savingSelected}>Close</button>
                  </>
                )}
              </div>
            )}
          </div>

          {!selected ? (
            <p className="muted">Choose an FH/CEM on the left to view details and funding requests.</p>
          ) : (
            <>
              <div className="mt-8">
                <label>FH/CEM Name
                  <input
                    value={(editingSelected ? draft?.name : selected.name) || ""}
                    onChange={(e)=> editingSelected && draft && setDraft({ ...draft, name: e.target.value })}
                    readOnly={!editingSelected}
                  />
                </label>
              </div>

              <div className="grid2 mt-8">
                <div>
                  <label>Phone
                    <input
                      value={(editingSelected ? draft?.phone : selected.phone) || ""}
                      onChange={(e)=> editingSelected && draft && setDraft({ ...draft, phone: e.target.value })}
                      readOnly={!editingSelected}
                    />
                  </label>
                </div>
                <div>
                  <label>Email
                    <input
                      value={(editingSelected ? draft?.email : selected.email) || ""}
                      onChange={(e)=> editingSelected && draft && setDraft({ ...draft, email: e.target.value })}
                      readOnly={!editingSelected}
                    />
                  </label>
                </div>
                <div>
                  <label>Fax
                    <input
                      value={(editingSelected ? draft?.fax : selected.fax) || ""}
                      onChange={(e)=> editingSelected && draft && setDraft({ ...draft, fax: e.target.value })}
                      readOnly={!editingSelected}
                    />
                  </label>
                </div>
                <div>
                  <label>Reps (comma separated)
                    <input
                      value={repsString}
                      onChange={(e)=> editingSelected && setRepsFromString(e.target.value)}
                      readOnly={!editingSelected}
                    />
                  </label>
                </div>
                <div className="col-span-full">
                  <label>Mailing Address
                    <textarea rows={2}
                      value={(editingSelected ? draft?.mailingAddress : selected.mailingAddress) || ""}
                      onChange={(e)=> editingSelected && draft && setDraft({ ...draft, mailingAddress: e.target.value })}
                      readOnly={!editingSelected}
                    />
                  </label>
                </div>
                <div className="col-span-full">
                  <label>Notes
                    <textarea rows={3}
                      value={(editingSelected ? draft?.notes : selected.notes) || ""}
                      onChange={(e)=> editingSelected && draft && setDraft({ ...draft, notes: e.target.value })}
                      readOnly={!editingSelected}
                    />
                  </label>
                </div>
              </div>

              <h4 className="title mt-16">Funding Requests</h4>
              {loadingFR ? (
                <p className="muted">Loading…</p>
              ) : !requestsForSelected.length ? (
                <p className="muted">No funding requests found for this FH/CEM (based on linked users).</p>
              ) : (
                <div className="overflow-x-auto">
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

      <div className="card">
        <div className="flex items-center justify-between gap-8">
          <h3 className="title">FH/CEM Link Requests</h3>
          <button className="btn" onClick={loadLinkRequests} disabled={requestsLoading}>
            {requestsLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {!requests.length ? (
          <p className="muted">No pending link requests.</p>
        ) : (
          <div className="list grid gap-6 mt-8">
            {requests.map(lr => (
              <div key={lr._id} className="item flex items-start justify-between gap-8 p-8 bordered">
                <div className="flex-1">
                  <div className="fw-700">{lr.requestedName}</div>
                  <div className="muted text-13">
                    Requested by: {lr.userId?.contactName || lr.userId?.email} • {lr.userId?.email}<br/>
                    Phone: {lr.userId?.contactPhone || "—"} • Email: {lr.userId?.contactEmail || "—"}
                  </div>
                </div>
                <div className="grid gap-6 minw-240">
                  <label className="grid gap-4">
                    <span className="muted text-12">Link to FH/CEM</span>
                    <select
                      onChange={(e)=> (lr as any)._approveTarget = e.target.value}
                      defaultValue=""
                    >
                      <option value="" disabled>Select FH/CEM…</option>
                      {items.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
                    </select>
                  </label>
                  <div className="flex gap-6">
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

      {edit && (
        <div className="modal-overlay">
          <div className="modal card w-720 maxh-90vh overflow-auto">
            <div className="modal-header">
              <h3 className="title">{edit._id ? "Edit FH/CEM" : "New FH/CEM"}</h3>
              <button className="btn" onClick={()=>setEdit(null)}>Close</button>
            </div>
            <div className="modal-body grid2">
              <div className="col-span-full">
                <label>FH/CEM Name
                  <input value={edit.name || ""} onChange={(e)=>setEdit({ ...edit, name: e.target.value })} />
                </label>
              </div>
              <div>
                <label>Phone
                  <input value={edit.phone || ""} onChange={(e)=>setEdit({ ...edit, phone: e.target.value })} />
                </label>
              </div>
              <div>
                <label>Email
                  <input value={edit.email || ""} onChange={(e)=>setEdit({ ...edit, email: e.target.value })} />
                </label>
              </div>
              <div>
                <label>Fax
                  <input value={edit.fax || ""} onChange={(e)=>setEdit({ ...edit, fax: e.target.value })} />
                </label>
              </div>
              <div>
                <label>Reps (comma separated)
                  <input
                    value={(edit.reps || []).join(", ")}
                    onChange={(e)=>setEdit({ ...edit, reps: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) })}
                  />
                </label>
              </div>
              <div className="col-span-full">
                <label>Mailing Address
                  <textarea rows={2} value={edit.mailingAddress || ""} onChange={(e)=>setEdit({ ...edit, mailingAddress: e.target.value })} />
                </label>
              </div>
              <div className="col-span-full">
                <label>Notes
                  <textarea rows={3} value={edit.notes || ""} onChange={(e)=>setEdit({ ...edit, notes: e.target.value })} />
                </label>
              </div>
            </div>
            <div className="modal-footer flex gap-8">
              <button className="btn" onClick={()=>setEdit(null)}>Cancel</button>
              <button className="btn btn-gold" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
