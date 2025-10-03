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
      <p className="muted login-intro">
        Welcome back. Enter your credentials to continue, or{" "}
        <Link href="/register">create an account</Link>.
      </p>

      {/* The form renders its own card container (.auth-box) */}
      <LoginForm />

      <p className="muted login-outro">
        Don’t have an account?{" "}
        <Link href="/register">Register here</Link>.
      </p>
    </main>
  );
}
