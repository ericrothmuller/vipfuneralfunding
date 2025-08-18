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
};

export default function RequestsTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/requests", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load funding requests");
        const data = await res.json();
        if (mounted) setRows(data?.requests || []);
      } catch (e: any) {
        setMsg(e?.message || "Could not load funding requests");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

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
                <td>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setSelectedId(r.id)}
                    aria-label={`View request for ${r.decName}`}
                  >
                    View
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

      {selectedId && (
        <RequestDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
