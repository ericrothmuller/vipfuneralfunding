// app/dashboard/page.tsx
import { cookies } from "next/headers";
import Link from "next/link";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import FundingRequest from "@/models/FundingRequest";
import { getUserFromCookie } from "@/lib/auth";
import ProfileForm from "@/components/ProfileForm";
import RequestsTable from "@/components/RequestsTable";
import NewFundingRequestForm from "@/components/NewFundingRequestForm";

export const runtime = "nodejs";

export default async function DashboardPage() {
  await dbConnect();

  const cookieStore = await cookies();
  const me = await getUserFromCookie(cookieStore);

  if (!me) {
    return (
      <main className="dash-wrap">
        <div className="card">
          <h1 className="title">You’re not signed in</h1>
          <p>Please log in to view your dashboard.</p>
          <div className="row">
            <Link href="/login" className="btn">Go to Login</Link>
          </div>
        </div>
      </main>
    );
  }

  const [profileDoc, requests] = await Promise.all([
    User.findById(me.sub).lean(),
    FundingRequest.find({ userId: me.sub }).sort({ createdAt: -1 }).lean(),
  ]);

  const profile = profileDoc
    ? {
        id: String(profileDoc._id),
        email: profileDoc.email || "",
        name: profileDoc.name || "",
        funeralHomeName: profileDoc.funeralHomeName || "",
        funeralHomePhone: profileDoc.funeralHomePhone || "",
        funeralHomeAddress: profileDoc.funeralHomeAddress || "",
        notes: profileDoc.notes || "",
      }
    : null;

  const rows =
    requests?.map((r: any) => ({
      id: String(r._id),
      decedentName: r.decedentName || "",
      insurer: r.insuranceCompany || "",
      policyNumber: r.policyNumber || "",
      assignmentAmount: r.assignmentAmount || "",
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "",
    })) ?? [];

  return (
    <main className="dash-wrap">
      <header className="dash-header">
        <div>
          <h1 className="title">Dashboard</h1>
          <p className="subtitle">Welcome back{profile?.name ? `, ${profile.name}` : ""}.</p>
        </div>
        <nav className="actions">
          <Link className="btn secondary" href="/logout">Logout</Link>
        </nav>
      </header>

      {/* Tabs (pure HTML/CSS with radio inputs) */}
      <section className="tabs">
        <input type="radio" name="tabset" id="tab1" defaultChecked />
        <label htmlFor="tab1">Profile</label>

        <input type="radio" name="tabset" id="tab2" />
        <label htmlFor="tab2">Funding Requests</label>

        <input type="radio" name="tabset" id="tab3" />
        <label htmlFor="tab3">New Funding Request</label>

        <div className="panels">
          <section className="panel">
            <div className="card">
              <h2 className="card-title">Edit Profile</h2>
              <ProfileForm profile={profile} />
            </div>
          </section>

          <section className="panel">
            <div className="card">
              <div className="card-head-row">
                <h2 className="card-title">Your Funding Requests</h2>
                <Link href="/requests" className="btn small">Open Full Page</Link>
              </div>
              {rows.length === 0 ? (
                <p>No requests yet. Submit your first request in the next tab.</p>
              ) : (
                <RequestsTable rows={rows} />
              )}
            </div>
          </section>

          <section className="panel">
            <div className="card">
              <h2 className="card-title">Submit a New Funding Request</h2>
              <NewFundingRequestForm />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
