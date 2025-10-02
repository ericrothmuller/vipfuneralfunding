// components/ThemeToggle.tsx
"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Load current theme on mount
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("vipff.theme")) as
      | "dark"
      | "light"
      | null;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      // default already handled in layout init, but keep state in sync
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "light" || attr === "dark") setTheme(attr);
    }
  }, []);

  function apply(next: "dark" | "light") {
    setTheme(next);
    try {
      localStorage.setItem("vipff.theme", next);
    } catch {}
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <div className="theme-toggle">
      <span className="muted mr-8">Theme:</span>
      <label className={`toggle-opt ${theme === "dark" ? "active" : ""}`}>
        <input
          type="radio"
          name="theme"
          value="dark"
          checked={theme === "dark"}
          onChange={() => apply("dark")}
        />
        Dark
      </label>
      <label className={`toggle-opt ${theme === "light" ? "active" : ""}`}>
        <input
          type="radio"
          name="theme"
          value="light"
          checked={theme === "light"}
          onChange={() => apply("light")}
        />
        Light
      </label>
    </div>
  );
}
