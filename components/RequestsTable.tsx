// components/RequestsTable.tsx
"use client";

import { useEffect, useState } from "react";
import RequestDetailModal from "@/components/RequestDetailModal";

type Row = {
  id: string;
  decName: string;
  insuranceCompany: string;
  policyNumbers: string;
  createdAt: string;
  fhRep: string;
  assignmentAmount: string;
  userId?: string; // present for admin list
};

export default function RequestsTable({ isAdmin = false }: { isAdmin?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(isAdmin ? "/api/admin/requests" : "/api/requests", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load funding requests");
      setRows(data?.requests || []);
    } catch (e: any) {
      setMsg(e?.message || "Could not load funding requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [isAdmin]);

  async function onDelete(id: string) {
    setMsg(null);
    try {
      const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Delete failed (code ${res.status})`);
      // remove from rows
      setRows(prev => prev.filter(r => r.id !== id));
      setConfirm(null);
    } catch (e: any) {
      setMsg(e?.message || "Delete failed");
    }
  }

  if (loading) return <p>Loading…</p>;
  if (msg) return <p className="error">{msg}</p>;

  return (
    <>
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
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.decName}</td>
                <td>{r.insuranceCompany}</td>
                <td>{r.policyNumbers}</td>
                <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</td>
                <td>{r.fhRep}</td>
                <td>{r.assignmentAmount}</td>
                <td style={{ whiteSpace: "nowrap", display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost" onClick={() => setSelectedId(r.id)}>View</button>
                  <button
                    className="btn"
                    onClick={() => setConfirm({ id: r.id, name: r.decName || r.policyNumbers || r.id })}
                    aria-label={`Delete request ${r.id}`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="muted" style={{ padding: 16 }}>
                  No funding requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View modal (can also delete inside) */}
      {selectedId && (
        <RequestDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          canDelete={true /* non-admins see only their own; admins can delete any */}
          onDeleted={(deletedId) => {
            setRows(prev => prev.filter(r => r.id !== deletedId));
            setSelectedId(null);
          }}
        />
      )}

      {/* Confirm delete modal */}
      {confirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="modal">
            <div className="modal-header">
              <h3 id="confirm-title">Delete Funding Request</h3>
              <button className="btn btn-ghost modal-close" onClick={() => setConfirm(null)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this request{confirm.name ? ` for “${confirm.name}”` : ""}? This action cannot be undone.</p>
            </div>
            <div className="modal-footer" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn" onClick={() => onDelete(confirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
