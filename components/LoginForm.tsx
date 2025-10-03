// components/LoginForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) setMsg(data?.error || "Login failed");
      else router.push("/dashboard");
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="centered pt-25">
      {/* Theme-aware logos for the form header (gold in dark, black in light) */}
      <Image
        className="login-logo theme-logo-dark"
        src="/VIP-Funeral-Funding-Logo-Gold.png"
        alt="VIP Funeral Funding logo (dark theme)"
        width={898}
        height={152}
        priority
      />
      <Image
        className="login-logo theme-logo-light"
        src="/VIP-Funeral-Funding-Logo-Black.png"
        alt="VIP Funeral Funding logo (light theme)"
        width={898}
        height={152}
        priority
      />

      <div className="auth-box">
        <h1>Login</h1>

        <form onSubmit={onSubmit} className="grid gap-12">
          <label>
            Email
            <input
              type="email"
              className="w-full"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              className="w-full"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </label>

          <button disabled={loading} type="submit" className="btn btn-gold">
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {msg && <p className="error">{msg}</p>}
        </form>
      </div>
    </main>
  );
}
