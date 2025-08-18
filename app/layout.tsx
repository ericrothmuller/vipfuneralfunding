// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VIP Funeral Funding",
  description: "VIP Funeral Funding CRM",
};

const THEME_INIT = `
try {
  var t = localStorage.getItem('vipff.theme');
  if (!t) {
    // Default to dark (your current theme)
    t = 'dark';
    localStorage.setItem('vipff.theme', t);
  }
  document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Set the theme before paint to avoid color flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
