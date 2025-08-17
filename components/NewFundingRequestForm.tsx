// app/components/NewFundingRequestForm.tsx
"use client";

import { useState } from "react";

export default function NewFundingRequestForm() {
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
