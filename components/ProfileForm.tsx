// app/components/ProfileForm.tsx
"use client";

import { useState } from "react";

export default function ProfileForm({ profile }: { profile: any }) {
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
