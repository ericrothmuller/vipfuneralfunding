// scripts/seed-insurance-companies.js
/**
 * Standalone Insurance Company Seeder (no dotenv, no TS imports)
 *
 * Usage (from app root):
 *   node scripts/seed-insurance-companies.js
 *   node scripts/seed-insurance-companies.js --file=seed/insurance_companies_batch2.json
 */

const path = require("node:path");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const mongoose = require("mongoose");

/* ---------------------------
   Load env WITHOUT dotenv
   --------------------------- */
(function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");

  // Node 22+: prefer process.loadEnvFile if available
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(envPath);
      return;
    } catch {
      // fallthrough to manual parser
    }
  }

  // Manual .env parser for simple KEY=VALUE lines
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const raw of content.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) continue;
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const key = m[1];
        // Strip outer quotes if present
        let val = m[2].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
        if (process.env[key] === undefined) process.env[key] = val;
      }
    }
  } catch (e) {
    console.warn("[seed] Warning: could not read .env.local:", e.message);
  }
})();

/* ---------------------------
   Verify MONGODB_URI
   --------------------------- */
const uri = (process.env.MONGODB_URI || "").trim();
if (!uri) {
  console.error(
    "[seed] ERROR: MONGODB_URI is missing.\n" +
      "Add it to .env.local in your app root, e.g.:\n" +
      'MONGODB_URI="mongodb+srv://user:pass@host/db?options"\n' +
      "Or pass it inline:\n" +
      "MONGODB_URI='mongodb+srv://...' node scripts/seed-insurance-companies.js"
  );
  process.exit(1);
}

/* ---------------------------
   Defaults
   --------------------------- */
const DEFAULT_SEED_FILE = path.resolve(process.cwd(), "seed", "insurance_companies.json");

/* ---------------------------
   Inline InsuranceCompany schema
   --------------------------- */
const insuranceCompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    fax: { type: String, default: "" },
    mailingAddress: { type: String, default: "" },
    verificationTime: { type: String, default: "" },  // e.g., "TBD"
    documentsToFund: { type: String, default: "" },   // e.g., "Assignment, CF, DC"
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

// Register or reuse model
const InsuranceCompany =
  mongoose.models.InsuranceCompany ||
  mongoose.model("InsuranceCompany", insuranceCompanySchema);

/* ---------------------------
   Helpers
   --------------------------- */
async function readSeedFile(filePath) {
  const raw = await fsp.readFile(filePath, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error(`Seed file is not an array: ${filePath}`);
  }
  return data;
}

/* ---------------------------
   Main
   --------------------------- */
async function main() {
  console.log("[seed] Connecting to MongoDB...");
  await mongoose.connect(uri, { dbName: "appdb" });
  console.log("[seed] Connected.");

  // Allow --file=path override
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
  console.log("[seed] Disconnected.");
}

main().catch(async (err) => {
  console.error("[seed] ERROR:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
