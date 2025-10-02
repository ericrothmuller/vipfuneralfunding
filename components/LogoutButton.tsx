// components/LogoutButton.tsx
"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login"); // redirect after logout
  }

  return (
    <button className="btn" onClick={handleLogout}>
      Log out
    </button>
  );
}
