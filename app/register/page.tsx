import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
import RegisterForm from "@/components/RegisterForm";

export const runtime = "nodejs";

export default async function RegisterPage() {
  const user = await getUserFromCookie(); // <-- await
  if (user) redirect("/dashboard");
  return <RegisterForm />;
}