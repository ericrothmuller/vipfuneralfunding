// app/requests/page.tsx
export const runtime = "nodejs";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserFromCookie } from "@/lib/auth";
import { headers } from "next/headers";

async function fetchRequests() {
  const h = await headers();                    // Next 15: await dynamic API
  const cookie = h.get("cookie") ?? "";
  const res = await fetch(`/api/requests`, {
    cache: "no-store",
    headers: { cookie },                        // forward cookie to API
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.requests || [];
}

export default async function RequestsListPage() {
  const me = await getUserFromCookie();
  if (!me) redirect("/login");

  const rows = await fetchRequests();

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: 24 }}>
      <h1>Funding Requests</h1>

      <div style={{ margin: "12px 0 20px" }}>
        <Link href="/requests/new" style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 6 }}>
          + New Funding Request
        </Link>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={{ padding: 8 }}>DEC Name</th>
              <th style={{ padding: 8 }}>Insurance Company</th>
              <th style={{ padding: 8 }}>Policy Number(s)</th>
              <th style={{ padding: 8 }}>Create Date</th>
              <th style={{ padding: 8 }}>FH/CEM Rep</th>
              <th style={{ padding: 8 }}>Assignment Amount</th>
              <th style={{ padding: 8 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: 8 }}>{r.decName}</td>
                <td style={{ padding: 8 }}>{r.insuranceCompany}</td>
                <td style={{ padding: 8 }}>{r.policyNumbers}</td>
                <td style={{ padding: 8 }}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</td>
                <td style={{ padding: 8 }}>{r.fhRep}</td>
                <td style={{ padding: 8 }}>{r.assignmentAmount}</td>
                <td style={{ padding: 8 }}>
                  <Link
                    href={`/requests/${r.id}`}
                    style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 6 }}
                  >
                    View Request
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 16, color: "#666" }}>
                  No funding requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
