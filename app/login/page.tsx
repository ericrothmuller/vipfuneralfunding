// app/login/page.tsx
import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const runtime = "nodejs";

export default async function LoginPage() {
  const user = await getUserFromCookie();
  if (user) redirect("/dashboard");

  // Render exactly like the home page: just the LoginForm (with its logo)
  return <LoginForm />;
}
