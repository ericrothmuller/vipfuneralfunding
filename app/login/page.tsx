import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const runtime = "nodejs";

export default function LoginPage() {
  const user = getUserFromCookie();
  // If already logged in, skip the login page
  if (user) redirect("/dashboard");
  return <LoginForm />;
}