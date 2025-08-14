import Image from "next/image";
import './globals.css';
export const runtime = "nodejs";
import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default function Home() {  
  const user = getUserFromCookie();
  if (user) redirect("/dashboard"); // already logged in → skip login
  return (  
        <div className="centered">
            <main>
              <br/>
              <Image
                src="/VIP-Funeral-Funding-Logo-Gold.png"
                alt="VIP Funeral Funding logo"
                width={898}
                height={152}
                style={{ width: "30%", height: "auto" }}
                priority
              />
              <LoginForm />
            </main>
            <footer>
              The Future of Funeral Funding. Coming Soon.
            </footer>
        </div>);
}