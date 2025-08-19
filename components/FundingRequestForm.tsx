// components/FundingRequestForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FundingRequestForm() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget); // includes the file automatically
      const res = await fetch("/api/requests", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Submit failed");
      setMsg("Submitted.");
      router.push("/requests"); // or keep on the same tab/modal
    } catch (err: any) {
      setMsg(err?.message || "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      {/* ...your existing inputs... */}

      <label>Upload Assignment
        {/* IMPORTANT: name MUST be assignmentUpload */}
        <input name="assignmentUpload" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.tif,.tiff,.webp,.gif,.txt" />
      </label>

      <button disabled={saving} className="btn" type="submit">
        {saving ? "Submitting…" : "Submit Funding Request"}
      </button>
      {msg && <p className={msg === "Submitted." ? "success" : "error"}>{msg}</p>}
    </form>
  );
}
