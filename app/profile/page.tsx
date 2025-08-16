// app/profile/page.tsx
import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
import ProfileForm from "@/components/ProfileForm";

export const runtime = "nodejs";

export default async function ProfilePage() {
  const user = await getUserFromCookie();
  if (!user) redirect("/login");

  return (
    <main style={{ maxWidth: 720, margin: "64px auto", padding: 24 }}>
      <h1>User Profile</h1>
      <p style={{ color: "#555" }}>Update your business details below.</p>
      <ProfileForm />
    </main>
  );
}
