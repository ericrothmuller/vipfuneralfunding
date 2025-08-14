import Image from "next/image";
import './globals.css';

export default function Home() {
  return (
    <div className="centered">
      <main>
        <Image
          src="/VIP-Funeral-Funding-Logo-Gold.png"
          alt="VIP Funeral Funding logo"
          width={898}
          height={152}
          style={{ width: "30%", height: "auto" }}
          priority
        />
      
        <p>The Future of Funeral Funding.</p>
      </main>
      <footer>
        Coming Soon.
      </footer>
    </div>
  );
}