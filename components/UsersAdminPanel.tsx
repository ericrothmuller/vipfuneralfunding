// components/UsersAdminPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "FH_CEM" | "NEW";
type Row = {
  id: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt?: string;
};

export default function UsersAdminPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"" | Role>("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const qs = filter ? `?role=${encodeURIComponent(filter)}` : "";
      const res = await fetch(`/api/admin/users${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load users");
      setRows(json.users || []);
    } catch (e: any) {
      setMsg(e?.message || "Could not load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  async function updateUser(id: string, patch: Partial<Pick<Row, "role" | "active">>) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Update failed");
      // Optimistic refresh
      setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } as Row : r)));
    } catch (e: any) {
      alert(e?.message || "Update failed");
    }
  }

  const allCount = rows.length;
  const counts = useMemo(() => {
    const c: Record<string, number> = { ADMIN: 0, FH_CEM: 0, NEW: 0 };
    for (const r of rows) c[r.role] = (c[r.role] || 0) + 1;
    return c;
  }, [rows]);

  return (
    <div className="users-admin">
      <div className="panel-row" style={{ marginBottom: 10 }}>
        <h2 className="panel-title">Users</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="btn"
            aria-label="Filter by role"
          >
            <option value="">All roles ({allCount})</option>
            <option value="ADMIN">Admin ({counts.ADMIN || 0})</option>
            <option value="FH_CEM">FH/CEM ({counts.FH_CEM || 0})</option>
            <option value="NEW">NEW ({counts.NEW || 0})</option>
          </select>
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {msg && <p className="error">{msg}</p>}

      {!loading && !msg && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.email}</td>
                  <td>
                    <select
                      value={r.role}
                      onChange={(e) => updateUser(r.id, { role: e.target.value as Role })}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="FH_CEM">FH/CEM</option>
                      <option value="NEW">NEW</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn"
                      onClick={() => updateUser(r.id, { active: !r.active })}
                      aria-label={r.active ? "Deactivate user" : "Reactivate user"}
                    >
                      {r.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</td>
                  <td />
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted" style={{ padding: 16 }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
