// scripts/seed-insurance-companies.js
/**
 * Standalone Insurance Company Seeder (JS-only, no TS imports)
 *
 * Usage:
 *   node scripts/seed-insurance-companies.js
 */

const path = require("node:path");
const fs = require("node:fs/promises");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

// ---- Safe runtime check for MONGODB_URI ----
const uri = (process.env.MONGODB_URI || "").trim();
if (!uri) {
  throw new Error("Missing MONGODB_URI in .env.local");
}

// Default seed file
const DEFAULT_SEED_FILE = path.resolve(process.cwd(), "seed", "insurance_companies.json");

// Inline InsuranceCompany schema (to avoid TS import issues)
const insuranceCompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    fax: { type: String, default: "" },
    mailingAddress: { type: String, default: "" },
    verificationTime: { type: String, default: "" },
    documentsToFund: { type: String, default: "" },
    acceptsAdvancements: { type: Boolean, default: true },
    sendAssignmentBy: {
      type: String,
      enum: ["Fax", "Email", "Other (see notes)"],
      default: "Fax",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// Register model safely
const InsuranceCompany =
  mongoose.models.InsuranceCompany ||
  mongoose.model("InsuranceCompany", insuranceCompanySchema);

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

  // Allow overriding the file path via --file=...
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
