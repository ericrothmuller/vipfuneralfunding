// components/InsuranceCompaniesPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type IC = {
  id: string;
  name: string;
  phone: string;
  fax: string;
  mailingAddress: string;
  verificationTime: string;
  documentsToFund: string;
  acceptsAdvancements: boolean;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
};

async function fetchJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch {
    throw new Error(`HTTP ${res.status} at ${url}: ${text.slice(0, 120)}`);
  }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status} at ${url}`);
  return data;
}

export default function InsuranceCompaniesPanel() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<IC[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // modal form state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IC | null>(null);

  const query = useMemo(() => (q ? `?q=${encodeURIComponent(q)}` : ""), [q]);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const data = await fetchJSON(`/api/admin/insurance-companies${query}`, { cache: "no-store" });
      setItems(data?.items || []);
    } catch (e: any) {
      setMsg(e?.message || "Failed to load insurance companies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [query]);

  function onAdd() {
    setEditing({
      id: "",
      name: "",
      phone: "",
      fax: "",
      mailingAddress: "",
      verificationTime: "",
      documentsToFund: "",
      acceptsAdvancements: false,
      notes: "",
    });
    setOpen(true);
  }
  function onEdit(item: IC) {
    setEditing({ ...item });
    setOpen(true);
  }
  function onClose() {
    setOpen(false);
    setEditing(null);
    setMsg(null);
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setMsg(null);
    try {
      await fetchJSON(`/api/admin/insurance-companies/${id}`, { method: "DELETE" });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e: any) {
      setMsg(e?.message || "Delete failed");
    }
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setMsg(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      phone: String(fd.get("phone") || ""),
      fax: String(fd.get("fax") || ""),
      mailingAddress: String(fd.get("mailingAddress") || ""),
      verificationTime: String(fd.get("verificationTime") || ""),
      documentsToFund: String(fd.get("documentsToFund") || ""),
      acceptsAdvancements: String(fd.get("acceptsAdvancements") || "No") === "Yes",
      notes: String(fd.get("notes") || ""),
    };

    try {
      if (!payload.name) throw new Error("Name is required");

      if (editing.id) {
        await fetchJSON(`/api/admin/insurance-companies/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setItems(prev => prev.map(i => (i.id === editing.id ? { ...i, ...payload } : i)));
      } else {
        await fetchJSON(`/api/admin/insurance-companies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await load();
      }

      onClose();
    } catch (e: any) {
      setMsg(e?.message || "Save failed");
    }
  }

  return (
    <div>
      <div className="panel-row" style={{ marginBottom: 12 }}>
        <h2 className="panel-title">Insurance Companies</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="search"
            placeholder="Search name, notes, documents…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ padding: "8px 10px", minWidth: 260 }}
          />
          <button className="btn" onClick={onAdd}>+ Add</button>
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {msg && <p className="error">{msg}</p>}

      {!loading && !msg && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Fax</th>
                <th>Verification Time</th>
                <th>Accepts Advancements</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td>{i.phone}</td>
                  <td>{i.fax}</td>
                  <td>{i.verificationTime}</td>
                  <td>{i.acceptsAdvancements ? "Yes" : "No"}</td>
                  <td style={{ whiteSpace: "nowrap", display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => onEdit(i)}>Edit</button>
                    <button className="btn" onClick={() => onDelete(i.id, i.name)}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted" style={{ padding: 16 }}>
                    No insurance companies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {open && editing && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ic-modal-title">
          <div className="modal">
            <div className="modal-header">
              <h3 id="ic-modal-title">{editing.id ? "Edit Insurance Company" : "Add Insurance Company"}</h3>
              <button className="btn btn-ghost modal-close" onClick={onClose} aria-label="Close">✕</button>
            </div>

            <form onSubmit={onSave}>
              {/* SCROLLABLE body */}
              <div
                className="modal-body"
                style={{
                  maxHeight: "70vh",
                  overflow: "auto",
                  minHeight: 0, // important in CSS grid to allow scrolling
                  display: "grid",
                  gap: 10,
                }}
              >
                {msg && <p className="error">{msg}</p>}

                <label>Name
                  <input name="name" type="text" defaultValue={editing.name} required />
                </label>
                <label>Phone
                  <input name="phone" type="tel" defaultValue={editing.phone} />
                </label>
                <label>Fax
                  <input name="fax" type="tel" defaultValue={editing.fax} />
                </label>
                <label>Mailing Address
                  <textarea name="mailingAddress" rows={2} defaultValue={editing.mailingAddress} />
                </label>
                <label>Verification Time
                  <input name="verificationTime" type="text" defaultValue={editing.verificationTime} placeholder="e.g., 24–48 hours" />
                </label>
                <label>Documents to Fund
                  <textarea name="documentsToFund" rows={2} defaultValue={editing.documentsToFund} placeholder="List docs or notes…" />
                </label>
                <label>Accepts Advancements
                  <select name="acceptsAdvancements" defaultValue={editing.acceptsAdvancements ? "Yes" : "No"}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </label>
                <label>Notes
                  <textarea name="notes" rows={3} defaultValue={editing.notes} />
                </label>
              </div>

              <div className="modal-footer" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn">{editing.id ? "Save Changes" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
