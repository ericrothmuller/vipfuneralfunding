// components/DashboardTabs.tsx
"use client";

import { useEffect, useId, useMemo, useState } from "react";
import ProfileForm from "@/components/ProfileForm";
import FundingRequestForm from "@/components/FundingRequestForm";
import RequestsTable from "@/components/RequestsTable";
import UsersAdminPanel from "@/components/UsersAdminPanel";
import InfoModal from "@/components/InfoModal";

type Role = "ADMIN" | "FH_CEM" | "NEW";
type TabKey = "profile" | "requests" | "new" | "users";

const BASE_TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "profile",  label: "Profile" },
  { key: "requests", label: "Funding Requests" },
  { key: "new",      label: "New Funding Request" },
];

export default function DashboardTabs({
  isAdmin,
  role,
}: {
  isAdmin: boolean;
  role: Role;
}) {
  const tabs = useMemo<ReadonlyArray<{ key: TabKey; label: string }>>(
    () => (isAdmin ? [...BASE_TABS, { key: "users", label: "Users" }] : BASE_TABS),
    [isAdmin]
  );

  const [active, setActive] = useState<TabKey>("profile");
  const [showGate, setShowGate] = useState(false);
  const labelId = useId();

  // When role/tabs change, ensure the saved tab is valid
  useEffect(() => {
    const saved = (typeof window !== "undefined"
      ? (window.localStorage.getItem("vipff.activeTab") as TabKey | null)
      : null);

    if (saved && tabs.some(t => t.key === saved)) {
      setActive(saved);
    } else {
      if (!tabs.some(t => t.key === active)) {
        setActive("profile");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length, role]);

  // Persist active tab
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("vipff.activeTab", active);
    }
  }, [active]);

  function onSelectTab(next: TabKey) {
    // NEW users can only edit Profile. Gate the other tabs with a modal.
    if (role === "NEW" && (next === "requests" || next === "new")) {
      setShowGate(true);
      return; // do not change active tab
    }
    setActive(next);
  }

  return (
    <>
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
              onClick={() => onSelectTab(t.key)}
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
            <button className="btn" onClick={() => onSelectTab("new")}>+ New Request</button>
          </div>
          {/* If the user somehow got here (e.g. via saved state), still gate it */}
          {role === "NEW" ? (
            <p className="muted" style={{ paddingTop: 8 }}>
              Your account needs to be approved before you can submit or view funding requests.
            </p>
          ) : (
            <RequestsTable />
          )}
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
          {role === "NEW" ? (
            <p className="muted" style={{ paddingTop: 8 }}>
              Your account needs to be approved before you can submit or view funding requests.
            </p>
          ) : (
            <FundingRequestForm />
          )}
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

      {showGate && (
        <InfoModal
          title="Approval Required"
          onClose={() => setShowGate(false)}
        >
          Your account needs to be approved before you can submit or view funding requests.
        </InfoModal>
      )}
    </>
  );
}
