// app/components/RequestsTable.tsx
"use client";

import Link from "next/link";

export type RequestRow = {
  id: string;
  decedentName: string;
  insurer: string;
  policyNumber: string;
  assignmentAmount: string;
  createdAt: string;
};

export default function RequestsTable({ rows }: { rows: RequestRow[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Decedent</th>
            <th>Insurer</th>
            <th>Policy #</th>
            <th>Assignment</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.decedentName || "—"}</td>
              <td>{r.insurer || "—"}</td>
              <td>{r.policyNumber || "—"}</td>
              <td>{r.assignmentAmount || "—"}</td>
              <td>{r.createdAt || "—"}</td>
              <td>
                <Link className="btn tiny" href={`/requests/${r.id}`}>
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
