// components/ProfileForm.tsx
"use client";

import { useEffect, useState } from "react";

type Profile = {
  fhCemName?: string | null; // derived on client from either user.fhName or populated FH
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

export default function ProfileForm() {
  const [profile, setProfile] = useState<Profile>({
    fhCemName: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [hasFHCem, setHasFHCem] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        if (mounted && data?.user) {
          const fhCemName = data.user.fhName || data.user.fhCem?.name || ""; // support either server shape
          const next: Profile = {
            fhCemName,
            contactName: data.user.contactName || "",
            contactPhone: data.user.contactPhone || "",
            contactEmail: data.user.contactEmail || "",
          };
          setProfile(next);
          setHasFHCem(!!(data.user.fhCemId || fhCemName));
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
    if (!editing) return;
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // only allow these fields to update
          contactName: profile.contactName,
          contactPhone: profile.contactPhone,
          contactEmail: profile.contactEmail,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Save failed");
      }
      setMsg("Saved.");
      setEditing(false);
    } catch (e: any) {
      setMsg(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onConnectFHCem() {
    const name = prompt("Enter your FH/CEM Name");
    if (!name) return;
    const res = await fetch("/api/profile/connect-fhcem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "Request failed");
      return;
    }
    alert("Request submitted. An Admin will review and link your account.");
  }

  if (loading) return <p>Loading…</p>;

  const ro = !editing;

  return (
    <form onSubmit={onSubmit} className="pf-form">
      <style jsx>{`
        :root { --gold: #d6b16d; }
        .pf-form {
          --title: #d6b16d; --card-bg: #0b0d0f; --border: #1a1c1f; --field: #121416; --muted: #e0e0e0;
          display: grid; gap: 14px; font-size: 18px; line-height: 1.45;
        }
        @media (prefers-color-scheme: light) {
          .pf-form { --title: #000; --card-bg: #fff; --border: #d0d5dd; --field: #f2f4f6; --muted: #333; }
        }
        .pf-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .pf-actions { display:flex; gap:8px; }
        .pf-card { background: var(--card-bg); border:1px solid var(--border); border-radius:0; padding:14px; }
        .pf-title { color: var(--title); font-weight:800; margin:0 0 12px 0; font-size:20px; }
        label { display:grid; gap:6px; color:#fff; }
        @media (prefers-color-scheme: light) { label { color:#000; } }
        input, textarea, .ro {
          width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:0; background: var(--field); color:#fff;
        }
        @media (prefers-color-scheme: light) { input, textarea, .ro { color:#000; background:#f6f6f6; border-color:#d0d0d0; } }
        input[disabled], textarea[disabled] { opacity:.8; cursor:not-allowed; }
        .btn { border:1px solid var(--border); background:var(--field); color:#fff; padding:10px 12px; border-radius:0; cursor:pointer; }
        .btn-gold { background:var(--gold); border-color:var(--gold); color:#000; }
      `}</style>

      <div className="pf-head">
        <h3 className="pf-title" style={{ margin: 0 }}>Your Business</h3>
        <div className="pf-actions">
          {!editing ? (
            <button type="button" className="btn btn-gold" onClick={() => setEditing(true)}>Edit Profile</button>
          ) : (
            <>
              <button type="button" className="btn" onClick={() => { setEditing(false); setMsg(null); }}>Cancel</button>
              <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
            </>
          )}
        </div>
      </div>

      <div className="pf-card">
        <h3 className="pf-title" style={{ fontSize: 18, marginTop: 0 }}>FH/CEM</h3>
        <label>FH/CEM Name (read-only)
          <div className="ro" aria-readonly>{profile.fhCemName || "Not connected"}</div>
        </label>
        {!hasFHCem && (
          <button type="button" className="btn" onClick={onConnectFHCem} style={{ marginTop: 8 }}>
            Connect my Account to FH/CEM
          </button>
        )}
      </div>

      <div className="pf-card">
        <h3 className="pf-title" style={{ fontSize: 18, marginTop: 0 }}>Primary Contact</h3>
        <label>Contact Name
          <input type="text" value={profile.contactName} onChange={(e) => set("contactName", e.target.value)} readOnly={!editing} disabled={ro} />
        </label>
        <label>Contact Phone
          <input type="tel" value={profile.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} readOnly={!editing} disabled={ro} />
        </label>
        <label>Contact Email
          <input type="email" value={profile.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} readOnly={!editing} disabled={ro} />
        </label>
      </div>

      {msg && (
        <p role="alert" style={{ color: msg === "Saved." ? "limegreen" : "crimson", marginTop: 8 }}>
          {msg}
        </p>
      )}
    </form>
  );
}
