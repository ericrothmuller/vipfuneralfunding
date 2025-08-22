// components/RequestsTable.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import RequestDetailModal from "@/components/RequestDetailModal";

type Row = {
  id: string;
  decName: string;
  insuranceCompany: string;
  policyNumbers: string;
  createdAt: string;
  fhRep: string;
  assignmentAmount: string;
  status: "Submitted" | "Verifying" | "Approved" | "Funded" | "Closed" | string;
  userId?: string;
  ownerEmail?: string; // present in admin list
};

const STATUS_OPTS = ["Submitted", "Verifying", "Approved", "Funded", "Closed"] as const;

async function fetchJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`HTTP ${res.status} at ${url}: ${text.slice(0, 120)}`);
  }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status} at ${url}`);
  return data;
}

export default function RequestsTable({ isAdmin = false }: { isAdmin?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // (Optional) Simple admin filters (status/from/to)
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const query = useMemo(() => {
    if (!isAdmin) return "";
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [isAdmin, status, from, to]);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const url = isAdmin ? `/api/admin/requests${query}` : "/api/requests";
      const data = await fetchJSON(url, { cache: "no-store" });
      setRows(data?.requests || []);
    } catch (e: any) {
      setMsg(e?.message || "Could not load funding requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, query]);

  async function onDelete(id: string) {
    setMsg(null);
    try {
      const data = await fetchJSON(`/api/requests/${id}`, { method: "DELETE" });
      if (data?.ok) setRows(prev => prev.filter(r => r.id !== id));
    } catch (e: any) {
      setMsg(e?.message || "Delete failed");
    }
  }

  async function onChangeStatus(id: string, nextStatus: string) {
    setMsg(null);
    try {
      // optimistic UI
      setRows(prev => prev.map(r => (r.id === id ? { ...r, status: nextStatus } : r)));
      await fetchJSON(`/api/requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (e: any) {
      setMsg(e?.message || "Status update failed");
      load(); // revert if failed
    }
  }

  if (loading) return <p>Loading…</p>;
  if (msg) return <p className="error">{msg}</p>;

  return (
    <>
      {isAdmin && (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <h3 className="panel-title" style={{ marginBottom: 8 }}>Filters</h3>
          <div style={{ display: "grid", gridTemplateColumns: "220px 180px 180px 1fr", gap: 8 }}>
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                {STATUS_OPTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
              <button className="btn" onClick={load}>Apply</button>
              <button className="btn btn-ghost" onClick={() => { setStatus(""); setFrom(""); setTo(""); }}>
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>DEC Name</th>
              <th>Insurance Company</th>
              <th>Policy Number(s)</th>
              <th>Create Date</th>
              <th>FH/CEM Rep</th>
              <th>Assignment Amount</th>
              <th>Status</th>
              {isAdmin && <th>Owner</th>}
              <th /> {/* Actions column (View / Delete) */}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const showDelete =
                isAdmin || (!isAdmin && r.status === "Submitted"); // FH/CEM only when Submitted

              return (
                <tr key={r.id}>
                  <td>{r.decName}</td>
                  <td>{r.insuranceCompany}</td>
                  <td>{r.policyNumbers}</td>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</td>
                  <td>{r.fhRep}</td>
                  <td>{r.assignmentAmount}</td>
                  <td>
                    {isAdmin ? (
                      <select
                        value={r.status}
                        onChange={(e) => onChangeStatus(r.id, e.target.value)}
                      >
                        {STATUS_OPTS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      r.status || "Submitted"
                    )}
                  </td>
                  {isAdmin && <td>{r.ownerEmail || ""}</td>}
                  <td style={{ whiteSpace: "nowrap", display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => setSelectedId(r.id)}>View</button>
                    {showDelete && (
                      <button className="btn" onClick={() => onDelete(r.id)}>Delete</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} className="muted" style={{ padding: 16 }}>
                  No funding requests{isAdmin ? " match your filters" : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedId && (
        <RequestDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          // Admin always allowed; FH/CEM allowed only when Submitted
          canDelete={
            !!rows.find(r => r.id === selectedId && (isAdmin || r.status === "Submitted"))
          }
          onDeleted={(deletedId) => {
            setRows(prev => prev.filter(r => r.id !== deletedId));
            setSelectedId(null);
          }}
        />
      )}
    </>
  );
}
