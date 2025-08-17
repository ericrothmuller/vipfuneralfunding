// app/requests/new/page.tsx
import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
import FundingRequestForm from "@/components/FundingRequestForm";

export const runtime = "nodejs";

export default async function NewFundingRequestPage() {
  const me = await getUserFromCookie();
  if (!me) redirect("/login");

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: 24 }}>
      <FundingRequestForm />
    </main>
  );
}