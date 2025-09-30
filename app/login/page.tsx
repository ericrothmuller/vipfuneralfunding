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
    <main className="wrap" style={{ maxWidth: 720, margin: "64px auto" }}>
      <section className="card" style={{ padding: 24 }}>
        <header
          className="brand"
          style={{ alignItems: "center", gap: 14, marginBottom: 18 }}
        >
          {/* Dark theme logo (gold) */}
          <img
            src="/VIP-Funeral-Funding-Logo-Gold.png"
            alt="VIP Funeral Funding LLC Logo"
            className="brand-logo theme-logo-dark"
            width={220}
            height={60}
          />
          {/* Light theme logo (black) */}
          <img
            src="/VIP-Funeral-Funding-Logo-Black.png"
            alt="VIP Funeral Funding LLC Logo"
            className="brand-logo theme-logo-light"
            width={220}
            height={60}
          />
        </header>

        <h1 style={{ margin: "8px 0 12px" }}>Sign in</h1>
        <p className="muted" style={{ marginTop: 0, marginBottom: 20 }}>
          Welcome back. Enter your credentials to continue, or{" "}
          <Link href="/register">create an account</Link>.
        </p>

        <LoginForm />

        <p className="muted" style={{ marginTop: 16 }}>
          Don’t have an account?{" "}
          <Link href="/register">Register here</Link>.
        </p>
      </section>
    </main>
  );
}
