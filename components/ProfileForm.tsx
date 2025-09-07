// components/ProfileForm.tsx
"use client";

import { useEffect, useState } from "react";

type Profile = {
  fhName: string;
  businessPhone: string;
  businessFax: string;
  mailingAddress: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
};

export default function ProfileForm() {
  const [profile, setProfile] = useState<Profile>({
    fhName: "",
    businessPhone: "",
    businessFax: "",
    mailingAddress: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    notes: "",
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
            contactName: data.user.contactName || "",
            contactPhone: data.user.contactPhone || "",
            contactEmail: data.user.contactEmail || "",
            notes: data.user.notes || "",
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

  function set<K extends keyof Profile>(key: K, val: string) {
    setProfile(p => ({ ...p, [key]: val }));
  }

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

  if (loading) return <p>Loading…</p>;

  return (
    <form onSubmit={onSubmit} className="pf-form">
      <style jsx>{`
        :root { --gold: #d6b16d; }

        .pf-form {
          --title: #d6b16d;
          --card-bg: #0b0d0f;
          --border: #1a1c1f;
          --field: #121416;
          --muted: #e0e0e0;
          display: grid;
          gap: 14px;
          font-size: 18px;
          line-height: 1.45;
        }

        /* Light theme overrides */
        @media (prefers-color-scheme: light) {
          .pf-form {
            --title: #000;
            --card-bg: #fff;
            --border: #d0d5dd;
            --field: #f2f4f6;
            --muted: #333;
          }
        }
        :global(body[data-theme="dark"]) .pf-form {
          --title: #d6b16d;
          --card-bg: #0b0d0f;
          --border: #1a1c1f;
          --field: #121416;
          --muted: #e0e0e0;
        }
        :global(body[data-theme="light"]) .pf-form {
          --title: #000;
          --card-bg: #fff;
          --border: #d0d5dd;
          --field: #f2f4f6;
          --muted: #333;
        }

        .pf-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 0;              /* squared */
          padding: 14px;
        }
        .pf-title {
          color: var(--title);
          font-weight: 800;
          margin: 0 0 12px 0;
          font-size: 20px;
        }
        .pf-grid-2 { display: grid; gap: 10px; grid-template-columns: 1fr 1fr; }
        label { display: grid; gap: 6px; color: #fff; }
        @media (prefers-color-scheme: light) { label { color: #000; } }

        input[type="text"],
        input[type="email"],
        input[type="tel"],
        textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 0;               /* squared */
          background: var(--field);
          color: #fff;
        }
        @media (prefers-color-scheme: light) {
          input[type="text"],
          input[type="email"],
          input[type="tel"],
          textarea { color: #000; }
        }

        .pf-muted { color: var(--muted); }

        @media (max-width: 900px) {
          .pf-grid-2 { grid-template-columns: 1fr; }
          .pf-form { font-size: 17px; }
        }
        @media (max-width: 600px) {
          .pf-form { font-size: 16px; }
        }
      `}</style>

      <div className="pf-card">
        <h3 className="pf-title">Business</h3>
        <label>FH/CEM Name
          <input type="text" value={profile.fhName} onChange={(e) => set("fhName", e.target.value)} />
        </label>

        <div className="pf-grid-2">
          <label>Business Phone
            <input type="tel" value={profile.businessPhone} onChange={(e) => set("businessPhone", e.target.value)} />
          </label>
          <label>Business Fax
            <input type="tel" value={profile.businessFax} onChange={(e) => set("businessFax", e.target.value)} />
          </label>
        </div>

        <label>Mailing Address
          <textarea rows={3} value={profile.mailingAddress} onChange={(e) => set("mailingAddress", e.target.value)} />
        </label>
      </div>

      <div className="pf-card">
        <h3 className="pf-title">Primary Contact</h3>
        <label>Contact Name
          <input type="text" value={profile.contactName} onChange={(e) => set("contactName", e.target.value)} />
        </label>
        <div className="pf-grid-2">
          <label>Contact Phone
            <input type="tel" value={profile.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
          </label>
          <label>Contact Email
            <input type="email" value={profile.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
          </label>
        </div>
      </div>

      <div className="pf-card">
        <h3 className="pf-title">Notes</h3>
        <textarea rows={4} value={profile.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>

      <button disabled={saving} className="btn" type="submit">
        {saving ? "Saving…" : "Save Profile"}
      </button>

      {msg && (
        <p role="alert" style={{ color: msg === "Saved." ? "limegreen" : "crimson", marginTop: 8 }}>
          {msg}
        </p>
      )}
    </form>
  );
}
