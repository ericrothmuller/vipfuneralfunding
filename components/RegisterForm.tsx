// components/RegisterForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (password !== confirm) {
      setMsg("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setMsg("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || "Registration failed");
      } else {
        // Auto-login (cookie set by API), send to dashboard
        router.push("/dashboard");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="centered pt-25">
      <Image
        className="login-logo"
        src="/VIP-Funeral-Funding-Logo-Gold.png"
        alt="VIP Funeral Funding logo"
        width={898}
        height={152}
        priority
      />

      <div className="auth-box">
        <h1>Create an account</h1>

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
              placeholder="At least 8 characters"
            />
          </label>

          <label>
            Confirm password
            <input
              type="password"
              className="w-full"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </label>

          <button disabled={loading} type="submit" className="btn btn-gold">
            {loading ? "Creating account..." : "Create account"}
          </button>

          {msg && <p className="error">{msg}</p>}
        </form>
      </div>
    </main>
  );
}
