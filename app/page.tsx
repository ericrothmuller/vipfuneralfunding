import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const runtime = "nodejs";

export default async function LoginPage() {
  const user = await getUserFromCookie();   // ⬅️ await
  if (user) redirect("/dashboard");
  return <LoginForm />;
}