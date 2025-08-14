import Image from "next/image";
import './globals.css';
export const runtime = "nodejs";
import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default function Home() {  
  const user = getUserFromCookie();
  if (user) redirect("/dashboard"); // already logged in → skip login
  return <LoginForm />;
}