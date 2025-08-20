// components/DashboardTabs.tsx
"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import FundingRequestForm from "@/components/FundingRequestForm";
import RequestsTable from "@/components/RequestsTable";
import UsersAdminPanel from "@/components/UsersAdminPanel";
import InfoModal from "@/components/InfoModal";
import ThemeToggle from "@/components/ThemeToggle";

type Role = "ADMIN" | "FH_CEM" | "NEW";
type TabKey = "profile" | "requests" | "new" | "users";

const BASE_TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "profile",  label: "Profile" },
  { key: "requests", label: "Funding Requests" },
  { key: "new",      label: "New Funding Request" },
];

export default function DashboardTabs({ isAdmin, role }: { isAdmin: boolean; role: Role }) {
  const tabs = useMemo<ReadonlyArray<{ key: TabKey; label: string }>>(
    () => (isAdmin ? [...BASE_TABS, { key: "users", label: "Users" }] : BASE_TABS),
    [isAdmin]
  );

  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<TabKey>("profile");
  const [showGate, setShowGate] = useState(false);
  const labelId = useId();

  // Initial tab (query param overrides, then localStorage)
  useEffect(() => {
    const q = (searchParams.get("tab") || "") as TabKey;
    const ls = (typeof window !== "undefined" ? localStorage.getItem("vipff.activeTab") : "") as TabKey;
    const first =
      (q && tabs.some(t => t.key === q) && q) ||
      (ls && tabs.some(t => t.key === ls) && ls) ||
      "profile";
    setActive(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length]);

  // React to later query changes (e.g., after submit)
  useEffect(() => {
    const q = (searchParams.get("tab") || "") as TabKey;
    if (q && tabs.some(t => t.key === q) && q !== active) {
      setActive(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Persist to localStorage and reflect in URL without scrolling
  useEffect(() => {
    if (!active) return;
    try { localStorage.setItem("vipff.activeTab", active); } catch {}
    router.replace(`?tab=${active}`, { scroll: false });
  }, [active, router]);

  function onSelectTab(next: TabKey) {
    if (role === "NEW" && (next === "requests" || next === "new")) {
      setShowGate(true);
      return;
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

        {/* Render only the active panel (unmount others to clear state/forms) */}
        {active === "profile" && (
          <div role="tabpanel" id="profile-panel" aria-labelledby="profile-tab" className="tabpanel">
            <div className="panel-row">
              <h2 className="panel-title">Profile</h2>
              <ThemeToggle />
            </div>
            <p className="muted">Update your business and contact information.</p>
            <ProfileForm />
          </div>
        )}

        {active === "requests" && (
          <div role="tabpanel" id="requests-panel" aria-labelledby="requests-tab" className="tabpanel">
            <div className="panel-row">
              <h2 className="panel-title">Funding Requests</h2>
              <button className="btn" onClick={() => onSelectTab("new")}>+ New Request</button>
            </div>
            {role === "NEW" ? (
              <p className="muted" style={{ paddingTop: 8 }}>
                Your account needs to be approved before you can submit or view funding requests.
              </p>
            ) : (
              <RequestsTable isAdmin={isAdmin} />
            )}
          </div>
        )}

        {active === "new" && (
          <div role="tabpanel" id="new-panel" aria-labelledby="new-tab" className="tabpanel">
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
        )}

        {isAdmin && active === "users" && (
          <div role="tabpanel" id="users-panel" aria-labelledby="users-tab" className="tabpanel">
            <h2 className="panel-title">Users</h2>
            <p className="muted">Manage roles and activation status.</p>
            <UsersAdminPanel />
          </div>
        )}
      </div>

      {showGate && (
        <InfoModal title="Approval Required" onClose={() => setShowGate(false)}>
          Your account needs to be approved before you can submit or view funding requests.
        </InfoModal>
      )}
    </>
  );
}
