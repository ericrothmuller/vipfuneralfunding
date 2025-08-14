import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";

export const runtime = "nodejs";

export default function DashboardPage() {
  const user = getUserFromCookie();
  if (!user) redirect("/login");

  return (
    <main style={{ maxWidth: 720, margin: "64px auto", padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user.email}!</p>
      <form action="/api/logout" method="POST" style={{ marginTop: 16 }}>
        <button type="submit" style={{ padding: 10 }}>Log out</button>
      </form>
    </main>
  );
}
