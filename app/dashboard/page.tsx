import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
export const runtime = "nodejs";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
  const user = await getUserFromCookie();
  if (!user) redirect("/login");

  return (
    <main style={{ maxWidth: 720, margin: "64px auto", padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user.email}!</p>
      <LogoutButton />
    </main>
  );
}
