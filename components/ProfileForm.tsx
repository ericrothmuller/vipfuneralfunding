// components/ProfileForm.tsx
"use client";

import { useEffect, useState } from "react";

type Profile = {
  fhName: string;
  businessPhone: string;
  businessFax: string;
  mailingAddress: string;
};

export default function ProfileForm() {
  const [profile, setProfile] = useState<Profile>({
    fhName: "",
    businessPhone: "",
    businessFax: "",
    mailingAddress: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        if (mounted && data?.user) {
          setProfile({
            fhName: data.user.fhName || "",
            businessPhone: data.user.businessPhone || "",
            businessFax: data.user.businessFax || "",
            mailingAddress: data.user.mailingAddress || "",
          });
        }
      } catch (e: any) {
        setMsg(e?.message || "Could not load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Save failed");
      }
      setMsg("Saved.");
    } catch (e: any) {
      setMsg(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof Profile>(key: K, val: string) {
    setProfile(p => ({ ...p, [key]: val }));
  }

  if (loading) return <p>Loading…</p>;

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
      <label>
        FH/CEM Name
        <input
          type="text"
          value={profile.fhName}
          onChange={e => set("fhName", e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
      </label>

      <label>
        Business Phone
        <input
          type="tel"
          value={profile.businessPhone}
          onChange={e => set("businessPhone", e.target.value)}
          placeholder="e.g. (555) 555-5555"
          style={{ width: "100%", padding: 8 }}
        />
      </label>

      <label>
        Business Fax
        <input
          type="tel"
          value={profile.businessFax}
          onChange={e => set("businessFax", e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
      </label>

      <label>
        Mailing Address
        <textarea
          value={profile.mailingAddress}
          onChange={e => set("mailingAddress", e.target.value)}
          rows={4}
          style={{ width: "100%", padding: 8 }}
        />
      </label>

      <button disabled={saving} type="submit" style={{ padding: 10 }}>
        {saving ? "Saving…" : "Save"}
      </button>

      {msg && <p style={{ color: msg === "Saved." ? "green" : "crimson" }}>{msg}</p>}
    </form>
  );
}