// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
import DashboardTabs from "@/components/DashboardTabs";

export const runtime = "nodejs";

export default async function DashboardPage() {
  const user = await getUserFromCookie();
  if (!user) redirect("/login");

  return (
    <main className="wrap">
      <header className="dash-header">
        <div className="brand">
          <img
            src="/VIP-Funeral-Funding-Logo-Gold.png"
            alt="VIP Funeral Funding"
            className="brand-logo"
          />
          <div className="brand-copy">
            <h1>Dashboard</h1>
            <p className="muted">Welcome, {user.email}</p>
          </div>
        </div>

        <form action="/api/logout" method="POST">
          <button className="btn btn-ghost" type="submit" aria-label="Log out">
            Log out
          </button>
        </form>
      </header>

      <section className="card">
        <DashboardTabs />
      </section>
    </main>
  );
}
