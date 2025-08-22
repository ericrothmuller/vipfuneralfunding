// scripts/seed-insurance-companies.ts
/**
 * Seed Insurance Companies into MongoDB (idempotent upsert by name)
 *
 * Usage:
 *   1) Ensure .env.local contains:
 *        MONGODB_URI="mongodb+srv://user:pass@cluster...."
 *   2) Place your seed file at: seed/insurance_companies.json
 *   3) Run (from app root):
 *        npx ts-node --transpile-only scripts/seed-insurance-companies.ts
 *      or add to package.json:
 *        "seed:ics": "ts-node --transpile-only scripts/seed-insurance-companies.ts"
 *      then:
 *        npm run seed:ics
 */

import "dotenv/config"; // <-- loads .env/.env.local automatically (no 'dotenv' identifier needed)
import path from "node:path";
import fs from "node:fs/promises";
import mongoose from "mongoose";

// IMPORTANT: ts-node often can't resolve Next.js path aliases like "@/models/..."
// Use a relative path instead:
import { InsuranceCompany } from "../models/InsuranceCompany";

// If your .env is named .env.local and not auto-loaded by dotenv/config in your setup,
// you can force-load it by uncommenting the next two lines:
// import * as dotenv from "dotenv";
// dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ---- Safe runtime check for MONGODB_URI ----
const uri = process.env.MONGODB_URI?.trim() ?? "";
if (!uri) {
  throw new Error(
    "Missing MONGODB_URI in environment. Add it to .env.local in your app root before running this seed."
  );
}

// Default seed file path
const DEFAULT_SEED_FILE = path.resolve(process.cwd(), "seed", "insurance_companies.json");

// Types for clarity
type SendAssignmentBy = "Fax" | "Email" | "Other (see notes)";

interface SeedIC {
  name: string;
  email?: string;
  phone?: string;
  fax?: string;
  mailingAddress?: string;
  verificationTime?: string;      // e.g. "2 business days" or "TBD"
  documentsToFund?: string;       // e.g. "Assignment, CF, DC"
  acceptsAdvancements?: boolean;  // default true if not provided
  sendAssignmentBy?: SendAssignmentBy; // default "Fax" if not provided
  notes?: string;
}

/** Read and parse the JSON seed file */
async function readSeedFile(filePath: string): Promise<SeedIC[]> {
  const raw = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error(`Seed file is not an array: ${filePath}`);
  }
  return data;
}

async function main() {
  console.log(`[seed] Connecting to MongoDB...`);
  await mongoose.connect(uri, { dbName: "appdb" });
  console.log(`[seed] Connected.`);

  // Optional CLI arg: --file=path/to/file.json
  const argFile = process.argv.find((a) => a.startsWith("--file="));
  const filePath = argFile ? argFile.slice("--file=".length) : DEFAULT_SEED_FILE;

  console.log(`[seed] Loading file: ${filePath}`);
  const items = await readSeedFile(filePath);

  let upserted = 0;
  let skipped = 0;

  for (const item of items) {
    const seed: SeedIC = {
      name: (item.name || "").trim(),
      email: item.email ?? "",
      phone: item.phone ?? "",
      fax: item.fax ?? "",
      mailingAddress: item.mailingAddress ?? "",
      verificationTime: item.verificationTime ?? "",
      documentsToFund: item.documentsToFund ?? "",
      acceptsAdvancements:
        typeof item.acceptsAdvancements === "boolean" ? item.acceptsAdvancements : true,
      sendAssignmentBy: (item.sendAssignmentBy as SendAssignmentBy) || "Fax",
      notes: item.notes ?? "",
    };

    if (!seed.name) {
      console.warn(`[seed] Skipped record without a valid name: ${JSON.stringify(item)}`);
      skipped++;
      continue;
    }

    await InsuranceCompany.findOneAndUpdate(
      { name: seed.name },
      {
        $set: {
          email: seed.email,
          phone: seed.phone,
          fax: seed.fax,
          mailingAddress: seed.mailingAddress,
          verificationTime: seed.verificationTime,
          documentsToFund: seed.documentsToFund,
          acceptsAdvancements: seed.acceptsAdvancements,
          sendAssignmentBy: seed.sendAssignmentBy,
          notes: seed.notes,
        },
      },
      { upsert: true, new: true }
    ).lean();

    console.log(`[seed] upserted: ${seed.name}`);
    upserted++;
  }

  console.log(`[seed] Done. upserted: ${upserted}, skipped: ${skipped}`);
  await mongoose.disconnect();
  console.log(`[seed] Disconnected.`);
}

// Run the seeder
main().catch(async (err) => {
  console.error(`[seed] ERROR:`, err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
