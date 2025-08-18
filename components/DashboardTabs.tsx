// components/DashboardTabs.tsx
"use client";

import { useEffect, useId, useMemo, useState } from "react";
import ProfileForm from "@/components/ProfileForm";
import FundingRequestForm from "@/components/FundingRequestForm";
import RequestsTable from "@/components/RequestsTable";
import UsersAdminPanel from "@/components/UsersAdminPanel";

type TabKey = "profile" | "requests" | "new" | "users";

const BASE_TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "profile",  label: "Profile" },
  { key: "requests", label: "Funding Requests" },
  { key: "new",      label: "New Funding Request" },
];

export default function DashboardTabs({ isAdmin }: { isAdmin: boolean }) {
  // Build the tab list safely with useMemo (and keep types intact)
  const tabs = useMemo<ReadonlyArray<{ key: TabKey; label: string }>>(
    () => (isAdmin ? [...BASE_TABS, { key: "users", label: "Users" }] : BASE_TABS),
    [isAdmin]
  );

  // Use a safe default rather than tabs[0].key
  const [active, setActive] = useState<TabKey>("profile");
  const labelId = useId();

  // Load last tab from localStorage (if valid for current role)
  useEffect(() => {
    const saved = (typeof window !== "undefined"
      ? (window.localStorage.getItem("vipff.activeTab") as TabKey | null)
      : null);

    if (saved && tabs.some(t => t.key === saved)) {
      setActive(saved);
    } else {
      // If we lost access to "users" because role changed, fall back to "profile"
      if (!tabs.some(t => t.key === active)) {
        setActive("profile");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length]); // re-evaluate when tabs set changes (i.e., role toggles)

  // Persist active tab
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("vipff.activeTab", active);
    }
  }, [active]);

  return (
    <div className="tabs">
      <div className="tablist" role="tablist" aria-label="Dashboard Sections" id={labelId}>
        {tabs.map((t) => (
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

      {isAdmin && (
        <div
          role="tabpanel"
          id="users-panel"
          aria-labelledby="users-tab"
          hidden={active !== "users"}
          className="tabpanel"
        >
          <h2 className="panel-title">Users</h2>
          <p className="muted">Manage roles and activation status.</p>
          <UsersAdminPanel />
        </div>
      )}
    </div>
  );
}
