import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
export const runtime = "nodejs";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getUserFromCookie();
  if (!user) redirect("/login");

  return (
    <main style={{ maxWidth: 720, margin: "64px auto", padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user.email}!</p>
      <p><Link href="/profile">Edit Profile</Link></p>
      <p style={{ marginTop: 12 }}><Link href="/requests">View Funding Requests</Link> &nbsp;|&nbsp; <Link href="/requests/new">Submit a Funding Request</Link>
</p>
      <LogoutButton />
    </main>
  );
}
