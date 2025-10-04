// components/DashboardTabs.tsx
"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import FundingRequestForm from "@/components/FundingRequestForm";
import RequestsTable from "@/components/RequestsTable";
import UsersAdminPanel from "@/components/UsersAdminPanel";
import InsuranceCompaniesPanel from "@/components/InsuranceCompaniesPanel";
import FHCemsAdminPanel from "@/components/FHCemsAdminPanel";
import InfoModal from "@/components/InfoModal";
import ThemeToggle from "@/components/ThemeToggle";

type Role = "ADMIN" | "FH_CEM" | "NEW";
type TabKey = "profile" | "requests" | "new" | "users" | "ics" | "fhcems";

const BASE_TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "profile",  label: "Profile" },
  { key: "requests", label: "Funding Requests" },
  { key: "new",      label: "New Funding Request" },
];

export default function DashboardTabs({ isAdmin, role }: { isAdmin: boolean; role: Role }) {
  const tabs = useMemo<ReadonlyArray<{ key: TabKey; label: string }>>(
    () =>
      isAdmin
        ? [...BASE_TABS, { key: "users", label: "Users" }, { key: "ics", label: "ICs" }, { key: "fhcems", label: "FH/CEMs" }]
        : BASE_TABS,
    [isAdmin]
  );

  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<TabKey>("profile");
  const [showGate, setShowGate] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const labelId = useId();

  // Initialize active tab from ?tab= or localStorage
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

  // Update active tab if ?tab= changes
  useEffect(() => {
    const q = (searchParams.get("tab") || "") as TabKey;
    if (q && tabs.some(t => t.key === q) && q !== active) setActive(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Persist active tab and sync URL
  useEffect(() => {
    if (!active) return;
    try { localStorage.setItem("vipff.activeTab", active); } catch {}
    router.replace(`?tab=${active}`, { scroll: false });
  }, [active, router]);

  function onSelectTab(next: TabKey) {
    if (role === "NEW" && (next === "requests" || next === "new")) {
      setShowGate(true);
      setMobileOpen(false);
      return;
    }
    setActive(next);
    setMobileOpen(false);
  }

  // Close mobile drawer with ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    if (mobileOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <>
      <div className="tabs">
        {/* Bar that holds desktop tabs and the mobile hamburger */}
        <div className="tabs-bar">
          {/* Desktop tablist */}
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

          {/* Mobile hamburger */}
          <button
            type="button"
            className="mobile-menu-btn btn btn-ghost"
            aria-label="Open menu"
            aria-haspopup="true"
            aria-controls="mobile-nav"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            ☰ Menu
          </button>
        </div>

        {/* Mobile drawer + overlay */}
        <div
          className={`mobile-nav-overlay ${mobileOpen ? "open" : ""}`}
          onClick={() => setMobileOpen(false)}
        />
        <nav
          id="mobile-nav"
          className={`mobile-nav ${mobileOpen ? "open" : ""}`}
          aria-labelledby={labelId}
        >
          <div className="mobile-nav-header">
            <span className="muted">Navigation</span>
            <button
              className="btn btn-ghost btn-icon"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="mobile-tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`mobile-tab ${active === t.key ? "active" : ""}`}
                onClick={() => onSelectTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Logout pushed to the bottom of the drawer */}
          <div className="mobile-nav-footer">
            <form action="/api/logout" method="POST">
              <button className="btn btn-link btn-block" type="submit" aria-label="Log out">
                Log out
              </button>
            </form>
          </div>
        </nav>

        {/* Panels */}
        {active === "profile" && (
          <div role="tabpanel" id="profile-panel" aria-labelledby="profile-tab" className="tabpanel">
            <div className="panel-row">
              <h2 className="panel-title">Profile</h2>
              <ThemeToggle />
            </div>
            <p className="muted">View or edit your business and contact information.</p>
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
              <p className="muted pt-8">Your account needs to be approved before you can submit or view funding requests.</p>
            ) : (
              <RequestsTable isAdmin={isAdmin} />
            )}
          </div>
        )}

        {active === "new" && (
          <div role="tabpanel" id="new-panel" aria-labelledby="new-tab" className="tabpanel">
            <h2 className="panel-title">New Funding Request</h2>
            <p className="muted">Submit a new funding request.</p>
            {role === "NEW" ? (
              <p className="muted pt-8">Your account needs to be approved before you can submit or view funding requests.</p>
            ) : (
              <FundingRequestForm isAdmin={isAdmin} />
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

        {isAdmin && active === "ics" && (
          <div role="tabpanel" id="ics-panel" aria-labelledby="ics-tab" className="tabpanel">
            <h2 className="panel-title">Insurance Companies</h2>
            <p className="muted">Create, edit, search, and delete insurance companies.</p>
            <InsuranceCompaniesPanel />
          </div>
        )}

        {isAdmin && active === "fhcems" && (
          <div role="tabpanel" id="fhcems-panel" aria-labelledby="fhcems-tab" className="tabpanel">
            <h2 className="panel-title">FH/CEMs</h2>
            <p className="muted">Manage funeral homes/cemeteries and approve link requests.</p>
            <FHCemsAdminPanel />
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
