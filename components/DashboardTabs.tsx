// components/DashboardTabs.tsx
"use client";

import { useEffect, useId, useState } from "react";
import ProfileForm from "@/components/ProfileForm";
import FundingRequestForm from "@/components/FundingRequestForm";
import RequestsTable from "@/components/RequestsTable";

type TabKey = "profile" | "requests" | "new";

const TABS: { key: TabKey; label: string }[] = [
  { key: "profile",  label: "Profile" },
  { key: "requests", label: "Funding Requests" },
  { key: "new",      label: "New Funding Request" },
];

export default function DashboardTabs() {
  const [active, setActive] = useState<TabKey>("profile");
  const labelId = useId();

  // Load/save the last tab to localStorage
  useEffect(() => {
    const saved = window.localStorage.getItem("vipff.activeTab") as TabKey | null;
    if (saved && TABS.find(t => t.key === saved)) setActive(saved);
  }, []);
  useEffect(() => {
    window.localStorage.setItem("vipff.activeTab", active);
  }, [active]);

  return (
    <div className="tabs">
      <div className="tablist" role="tablist" aria-label="Dashboard Sections" id={labelId}>
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            aria-controls={`${t.key}-panel`}
            id={`${t.key}-tab`}
            className="tab"
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="profile-panel"
        aria-labelledby="profile-tab"
        hidden={active !== "profile"}
        className="tabpanel"
      >
        <h2 className="panel-title">Profile</h2>
        <p className="muted">Update your business and contact information.</p>
        <ProfileForm />
      </div>

      <div
        role="tabpanel"
        id="requests-panel"
        aria-labelledby="requests-tab"
        hidden={active !== "requests"}
        className="tabpanel"
      >
        <div className="panel-row">
          <h2 className="panel-title">Funding Requests</h2>
          <button className="btn" onClick={() => setActive("new")}>+ New Request</button>
        </div>
        <RequestsTable />
      </div>

      <div
        role="tabpanel"
        id="new-panel"
        aria-labelledby="new-tab"
        hidden={active !== "new"}
        className="tabpanel"
      >
        <h2 className="panel-title">New Funding Request</h2>
        <p className="muted">Submit a new funding request. Upload an assignment if available.</p>
        <FundingRequestForm />
      </div>
    </div>
  );
}