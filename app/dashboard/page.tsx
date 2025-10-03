// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
import DashboardTabs from "@/components/DashboardTabs";

export const runtime = "nodejs";

export default async function DashboardPage() {
  const user = await getUserFromCookie();
  if (!user) redirect("/login");

  const isAdmin = user.role === "ADMIN";

  return (
    <main className="wrap">
      {/* New responsive header (classes only) */}
      <header className="header">
        <div className="header-inner">
          {/* Row 1: centered logo (desktop & mobile) */}
          <div className="header-logo">
            {/* Dark theme logo (gold) */}
            <img
              src="/VIP-Funeral-Funding-Logo-Gold.png"
              alt="VIP Funeral Funding"
              className="theme-logo-dark"
              width={898}
              height={152}
            />
            {/* Light theme logo (black) */}
            <img
              src="/VIP-Funeral-Funding-Logo-Black.png"
              alt="VIP Funeral Funding"
              className="theme-logo-light"
              width={898}
              height={152}
            />
          </div>

          {/* Row 2: desktop -> title left, welcome+logout right; mobile -> stacked centered */}
          <div className="header-row">
            <h1 className="header-title">Dashboard</h1>

            <div className="header-right">
              <span className="header-welcome">Welcome, {user.email}</span>
              <form action="/api/logout" method="POST">
                <button className="btn btn-ghost" type="submit" aria-label="Log out">
                  Log out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <section className="card">
        <DashboardTabs isAdmin={isAdmin} role={user.role as "ADMIN" | "FH_CEM" | "NEW"} />
      </section>
    </main>
  );
}
