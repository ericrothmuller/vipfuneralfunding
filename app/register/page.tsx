// app/register/page.tsx
import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
import RegisterForm from "@/components/RegisterForm";

export const runtime = "nodejs";

export default function RegisterPage() {
  const user = getUserFromCookie();
  if (user) redirect("/dashboard");
  return <RegisterForm />;
}