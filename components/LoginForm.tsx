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
    <main className="centered" style={{paddingTop: 25}}>
      <Image
        className="centered"
        src="/VIP-Funeral-Funding-Logo-Gold.png"
        alt="VIP Funeral Funding logo"
        width={898}
        height={152}
        style={{ width: "30%", height: "auto" }}
        priority
      />
      <div style={{ maxWidth: 420, margin: "64px auto", padding: 24 }}>
        <h1>Login</h1>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <label>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", padding: 8 }} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%", padding: 8 }} />
          </label>
          <button disabled={loading} type="submit" style={{ padding: 10 }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          {msg && <p style={{ color: "crimson" }}>{msg}</p>}
        </form>
        <br/>
        <button
          type="button"
          onClick={() => router.push("/register")}
          style={{ padding: 10, marginTop: 8 }}
        >
          Need an account? Register
        </button>
      </div>
    </main>
  );
}