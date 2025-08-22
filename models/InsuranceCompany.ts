// models/InsuranceCompany.ts
import { Schema, model, models, InferSchemaType, Model } from "mongoose";

const InsuranceCompanySchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    email: { type: String, default: "" },           // NEW
    phone: { type: String, default: "" },
    fax: { type: String, default: "" },
    mailingAddress: { type: String, default: "" },
    verificationTime: { type: String, default: "" }, // free-form (e.g., "24–48 hours")
    documentsToFund: { type: String, default: "" },  // list or notes
    acceptsAdvancements: { type: Boolean, default: false },
    sendAssignmentBy: {                               // NEW
      type: String,
      enum: ["Fax", "Email", "Other (see notes)"],
      default: "Fax",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export type InsuranceCompanyDoc = InferSchemaType<typeof InsuranceCompanySchema>;

export const InsuranceCompany: Model<InsuranceCompanyDoc> =
  (models.InsuranceCompany as Model<InsuranceCompanyDoc>) ||
  model<InsuranceCompanyDoc>("InsuranceCompany", InsuranceCompanySchema);
