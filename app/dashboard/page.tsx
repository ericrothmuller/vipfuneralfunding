// app/dashboard/page.tsx
import { cookies } from "next/headers";
import Link from "next/link";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import FundingRequest from "@/models/FundingRequest";
import { getUserFromCookie } from "@/lib/auth";

export const runtime = "nodejs";

export default async function DashboardPage() {
  await dbConnect();

  const cookieStore = await cookies();
  const me = await getUserFromCookie(cookieStore);

  if (!me) {
    return (
      <main className="dash-wrap">
        <div className="card">
          <h1 className="title">You’re not signed in</h1>
          <p>Please log in to view your dashboard.</p>
          <div className="row">
            <Link href="/login" className="btn">Go to Login</Link>
          </div>
        </div>
      </main>
    );
  }

  const [profileDoc, requests] = await Promise.all([
    User.findById(me.sub).lean(),
    FundingRequest.find({ userId: me.sub }).sort({ createdAt: -1 }).lean()
  ]);

  const profile = profileDoc
    ? {
        id: String(profileDoc._id),
        email: profileDoc.email || "",
        name: profileDoc.name || "",
        funeralHomeName: profileDoc.funeralHomeName || "",
        funeralHomePhone: profileDoc.funeralHomePhone || "",
        funeralHomeAddress: profileDoc.funeralHomeAddress || "",
        notes: profileDoc.notes || ""
      }
    : null;

  const rows =
    requests?.map((r: any) => ({
      id: String(r._id),
      decedentName: r.decedentName || "",
      insurer: r.insuranceCompany || "",
      policyNumber: r.policyNumber || "",
      assignmentAmount: r.assignmentAmount || "",
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "",
    })) ?? [];

  return (
    <main className="dash-wrap">
      <header className="dash-header">
        <div>
          <h1 className="title">Dashboard</h1>
          <p className="subtitle">Welcome back{profile?.name ? `, ${profile.name}` : ""}.</p>
        </div>
        <nav className="actions">
          <Link className="btn secondary" href="/logout">Logout</Link>
        </nav>
      </header>

      {/* Tabs (pure HTML/CSS with radio inputs) */}
      <section className="tabs">
        <input type="radio" name="tabset" id="tab1" defaultChecked />
        <label htmlFor="tab1">Profile</label>

        <input type="radio" name="tabset" id="tab2" />
        <label htmlFor="tab2">Funding Requests</label>

        <input type="radio" name="tabset" id="tab3" />
        <label htmlFor="tab3">New Funding Request</label>

        <div className="panels">
          {/* Panel 1: Profile */}
          <section className="panel">
            <div className="card">
              <h2 className="card-title">Edit Profile</h2>
              <ProfileForm profile={profile} />
            </div>
          </section>

          {/* Panel 2: Table of requests */}
          <section className="panel">
            <div className="card">
              <div className="card-head-row">
                <h2 className="card-title">Your Funding Requests</h2>
                <Link href="/requests" className="btn small">Open Full Page</Link>
              </div>
              {rows.length === 0 ? (
                <p>No requests yet. Submit your first request in the next tab.</p>
              ) : (
                <RequestsTable rows={rows} />
              )}
            </div>
          </section>

          {/* Panel 3: New request form */}
          <section className="panel">
            <div className="card">
              <h2 className="card-title">Submit a New Funding Request</h2>
              <NewFundingRequestForm />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

/* ---------- Client components in the same file ---------- */
"use client";
import { useState } from "react";

// ---------------- ProfileForm ----------------
function ProfileForm({ profile }: { profile: any }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<null | "ok" | "err">(null);

  const [form, setForm] = useState({
    email: profile?.email ?? "",
    name: profile?.name ?? "",
    funeralHomeName: profile?.funeralHomeName ?? "",
    funeralHomePhone: profile?.funeralHomePhone ?? "",
    funeralHomeAddress: profile?.funeralHomeAddress ?? "",
    notes: profile?.notes ?? "",
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setSaved("ok");
    } catch {
      setSaved("err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <div className="grid2">
        <div className="field">
          <label>Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            placeholder="Your name"
          />
        </div>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="grid2">
        <div className="field">
          <label>Funeral Home</label>
          <input
            value={form.funeralHomeName}
            onChange={(e) => setForm((s) => ({ ...s, funeralHomeName: e.target.value }))}
            placeholder="Business name"
          />
        </div>
        <div className="field">
          <label>Phone</label>
          <input
            value={form.funeralHomePhone}
            onChange={(e) => setForm((s) => ({ ...s, funeralHomePhone: e.target.value }))}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div className="field">
        <label>Address</label>
        <input
          value={form.funeralHomeAddress}
          onChange={(e) => setForm((s) => ({ ...s, funeralHomeAddress: e.target.value }))}
          placeholder="Street, City, State"
        />
      </div>

      <div className="field">
        <label>Notes</label>
        <textarea
          rows={4}
          value={form.notes}
          onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
          placeholder="Any internal notes"
        />
      </div>

      <div className="row">
        <button className="btn" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saved === "ok" && <span className="pill success">Saved</span>}
        {saved === "err" && <span className="pill danger">Save failed</span>}
      </div>
    </form>
  );
}

// ---------------- RequestsTable ----------------
function RequestsTable({
  rows,
}: {
  rows: Array<{
    id: string;
    decedentName: string;
    insurer: string;
    policyNumber: string;
    assignmentAmount: string;
    createdAt: string;
  }>;
}) {
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

// ---------------- NewFundingRequestForm ----------------
function NewFundingRequestForm() {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<null | "ok" | "err">(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        credentials: "include",
        body: data,
      });
      if (!res.ok) throw new Error("Failed");
      form.reset();
      setStatus("ok");
    } catch {
      setStatus("err");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <div className="grid2">
        <div className="field">
          <label>Decedent Name</label>
          <input name="decedentName" placeholder="Full name" required />
        </div>
        <div className="field">
          <label>Insurance Company</label>
          <input name="insuranceCompany" placeholder="e.g., MetLife" />
        </div>
      </div>

      <div className="grid3">
        <div className="field">
          <label>Policy Number</label>
          <input name="policyNumber" placeholder="ABC-123" />
        </div>
        <div className="field">
          <label>Assignment Amount</label>
          <input name="assignmentAmount" placeholder="$" />
        </div>
        <div className="field">
          <label>Date of Death</label>
          <input type="date" name="dateOfDeath" />
        </div>
      </div>

      <div className="field">
        <label>Notes</label>
        <textarea name="notes" rows={4} placeholder="Optional details" />
      </div>

      <div className="field">
        <label>Upload (PDF/JPG/PNG/DOC/DOCX)</label>
        <input
          type="file"
          name="attachment"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />
      </div>

      <div className="row">
        <button className="btn" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
        {status === "ok" && <span className="pill success">Submitted</span>}
        {status === "err" && <span className="pill danger">Submit failed</span>}
      </div>
    </form>
  );
}
