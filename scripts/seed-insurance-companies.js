// scripts/seed-insurance-companies.js
/**
 * Seed Insurance Companies into MongoDB (idempotent upsert by name)
 *
 * Usage:
 *   node scripts/seed-insurance-companies.js
 */

require("dotenv").config({ path: ".env.local" });
const path = require("node:path");
const fs = require("node:fs/promises");
const mongoose = require("mongoose");
const { InsuranceCompany } = require("../models/InsuranceCompany");

const uri = (process.env.MONGODB_URI || "").trim();
if (!uri) {
  throw new Error("Missing MONGODB_URI in environment. Add it to .env.local");
}

const DEFAULT_SEED_FILE = path.resolve(process.cwd(), "seed", "insurance_companies.json");

async function readSeedFile(filePath) {
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

  const argFile = process.argv.find((a) => a.startsWith("--file="));
  const filePath = argFile ? argFile.slice("--file=".length) : DEFAULT_SEED_FILE;

  console.log(`[seed] Loading file: ${filePath}`);
  const items = await readSeedFile(filePath);

  let upserted = 0;
  let skipped = 0;

  for (const item of items) {
    const seed = {
      name: (item.name || "").trim(),
      email: item.email || "",
      phone: item.phone || "",
      fax: item.fax || "",
      mailingAddress: item.mailingAddress || "",
      verificationTime: item.verificationTime || "",
      documentsToFund: item.documentsToFund || "",
      acceptsAdvancements:
        typeof item.acceptsAdvancements === "boolean" ? item.acceptsAdvancements : true,
      sendAssignmentBy: item.sendAssignmentBy || "Fax",
      notes: item.notes || "",
    };

    if (!seed.name) {
      console.warn(`[seed] Skipped record without a valid name: ${JSON.stringify(item)}`);
      skipped++;
      continue;
    }

    await InsuranceCompany.findOneAndUpdate(
      { name: seed.name },
      { $set: seed },
      { upsert: true, new: true }
    ).lean();

    console.log(`[seed] upserted: ${seed.name}`);
    upserted++;
  }

  console.log(`[seed] Done. upserted: ${upserted}, skipped: ${skipped}`);
  await mongoose.disconnect();
  console.log(`[seed] Disconnected.`);
}

main().catch(async (err) => {
  console.error(`[seed] ERROR:`, err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
