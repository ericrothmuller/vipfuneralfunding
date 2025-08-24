// app/requests/[id]/verification/page.tsx
export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import VerificationEditor from "@/components/VerificationEditor";

async function loadData(id: string) {
  const h = await headers();
  const cookie = (await cookies()).toString();

  const url = `/api/requests/${id}/verification`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { cookie, "x-forwarded-proto": h.get("x-forwarded-proto") || "", "x-forwarded-host": h.get("x-forwarded-host") || "" },
  });
  if (!res.ok) return { prefill: null, verification: null, err: true };
  return res.json();
}

// params is Promise<{ id: string }>
export default async function VerificationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromCookie();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard?tab=requests");

  const { id } = await params;
  const { prefill, verification, err } = await loadData(id);

  if (err) {
    return (
      <main className="wrap" style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
        <h1>Verification</h1>
        <p className="error">Unable to load verification data.</p>
        <a className="btn" href="/dashboard?tab=requests">Back to Requests</a>
      </main>
    );
  }

  return (
    <main className="wrap" style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <div className="panel-row" style={{ marginBottom: 12 }}>
        <h1 className="panel-title">Verification</h1>
        <a className="btn btn-ghost" href="/dashboard?tab=requests">← Back to Requests</a>
      </div>

      <VerificationEditor
        requestId={id}
        prefill={prefill}
        initial={verification}
      />
    </main>
  );
}
