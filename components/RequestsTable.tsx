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
  status: "Submitted" | "Verifying" | "Approved" | "Funded" | "Closed" | string;
  userId?: string; // present for admin list
};

const STATUS_OPTS = ["Submitted", "Verifying", "Approved", "Funded", "Closed"] as const;

export default function RequestsTable({ isAdmin = false }: { isAdmin?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      setRows(prev => prev.filter(r => r.id !== id));
    } catch (e: any) {
      setMsg(e?.message || "Delete failed");
    }
  }

  async function onChangeStatus(id: string, nextStatus: string) {
    setMsg(null);
    try {
      // optimistic UI update
      setRows(prev => prev.map(r => (r.id === id ? { ...r, status: nextStatus } : r)));
      const res = await fetch(`/api/requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Status update failed (code ${res.status})`);
    } catch (e: any) {
      setMsg(e?.message || "Status update failed");
      load(); // revert optimistic update
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
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const canDeleteFH = r.status === "Submitted";
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
                  <td style={{ whiteSpace: "nowrap", display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => setSelectedId(r.id)}>View</button>
                    {/* Delete: Admin always; FH/CEM only if status === Submitted */}
                    <button
                      className="btn"
                      onClick={() => onDelete(r.id)}
                      disabled={!isAdmin && !canDeleteFH}
                      title={!isAdmin && !canDeleteFH ? "Cannot delete after status changes" : "Delete"}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="muted" style={{ padding: 16 }}>
                  No funding requests yet.
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
