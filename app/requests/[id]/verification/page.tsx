// app/requests/[id]/verification/page.tsx
export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/origin";
import VerificationEditor from "@/components/VerificationEditor";

async function loadData(id: string) {
  // Build absolute origin and forward the cookie header only
  const base = await getBaseUrl();
  const h = await headers();
  const cookie = h.get("cookie") ?? "";

  const res = await fetch(`${base}/api/requests/${id}/verification`, {
    cache: "no-store",
    headers: { cookie },
  });

  // Return a consistent shape; caller handles errors
  if (!res.ok) {
    let err = "Failed";
    try {
      const j = await res.json();
      err = j?.error || err;
    } catch {
      // ignore
    }
    return { prefill: null, verification: null, error: err };
  }

  return res.json();
}

// params is Promise<{ id: string }>
export default async function VerificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // AuthN + AuthZ: ADMIN only
  const user = await getUserFromCookie();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard?tab=requests");

  const { id } = await params;

  const { prefill, verification, error } = await loadData(id);

  if (error) {
    // Render a friendly message instead of throwing
    return (
      <main className="wrap" style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
        <div className="panel-row" style={{ marginBottom: 12 }}>
          <h1 className="panel-title">Verification</h1>
          <a className="btn btn-ghost" href="/dashboard?tab=requests">← Back to Requests</a>
        </div>
        <p className="error">Unable to load verification data: {String(error)}</p>
      </main>
    );
  }

  // Safety: if API returned nulls but no error key, show a generic fallback
  if (!prefill) {
    return (
      <main className="wrap" style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
        <div className="panel-row" style={{ marginBottom: 12 }}>
          <h1 className="panel-title">Verification</h1>
          <a className="btn btn-ghost" href="/dashboard?tab=requests">← Back to Requests</a>
        </div>
        <p className="error">No data available for this request.</p>
      </main>
    );
  }

  return (
    <main className="wrap" style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <div className="panel-row" style={{ marginBottom: 12 }}>
        <h1 className="panel-title">Verification</h1>
        <a className="btn btn-ghost" href="/dashboard?tab=requests">← Back to Requests</a>
      </div>

      <VerificationEditor requestId={id} prefill={prefill} initial={verification} />
    </main>
  );
}
