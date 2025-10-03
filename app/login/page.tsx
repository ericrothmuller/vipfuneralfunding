// app/login/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserFromCookie } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const runtime = "nodejs";

export default async function LoginPage() {
  const user = await getUserFromCookie();
  if (user) redirect("/dashboard");

  return (
    <main className="wrap login-page">
      {/* Logo header (theme-aware) */}
      <header className="login-header">
        {/* Dark theme logo (gold) */}
        <img
          src="/VIP-Funeral-Funding-Logo-Gold.png"
          alt="VIP Funeral Funding LLC Gold Logo"
          className="theme-logo-dark login-logo-lg"
          width={220}
          height={60}
        />
        {/* Light theme logo (black) */}
        <img
          src="/VIP-Funeral-Funding-Logo-Black.png"
          alt="VIP Funeral Funding LLC Black Logo"
          className="theme-logo-light login-logo-lg"
          width={220}
          height={60}
        />
      </header>

      <h1 className="login-title">Sign in</h1>

      {/* Render form without its own logo to avoid duplicate */}
      <LoginForm showLogo={false} />
    </main>
  );
}
