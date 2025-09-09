// models/FundingRequest.ts
import mongoose, { Schema, Types } from "mongoose";

export type FundingStatus = "Submitted" | "Verifying" | "Approved" | "Funded" | "Closed";

export interface IFundingRequest {
  _id?: Types.ObjectId;

  // ownership / relations
  ownerId: Types.ObjectId;                   // User who created it
  insuranceCompanyId?: Types.ObjectId | null;
  fhCemId?: Types.ObjectId | null;           // optional, if you later link requests directly to an FH/CEM

  // decedent & case basics (minimal set used by lists)
  decedentFirstName?: string;
  decedentLastName?: string;

  // insurance details
  otherInsuranceCompany?: {
    name?: string;
    phone?: string;
    fax?: string;
    notes?: string;
  } | null;
  policyNumbers?: string[];                  // dynamic list
  beneficiaries?: string[];                  // dynamic list

  // financials
  totalServiceAmount?: number;
  familyAdvancementAmount?: number;
  vipFee?: number;
  assignmentAmount?: number;

  // uploads
  assignmentUploadPath?: string;
  otherUploadPaths?: string[];               // NEW: multiple other documents

  // workflow
  status: FundingStatus;

  // timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

const FundingRequestSchema = new Schema<IFundingRequest>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    insuranceCompanyId: { type: Schema.Types.ObjectId, ref: "InsuranceCompany", default: null, index: true },
    fhCemId: { type: Schema.Types.ObjectId, ref: "FHCem", default: null, index: true },

    decedentFirstName: { type: String, trim: true },
    decedentLastName: { type: String, trim: true },

    otherInsuranceCompany: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      fax: { type: String, trim: true },
      notes: { type: String, trim: true },
    },

    policyNumbers: { type: [String], default: [] },
    beneficiaries: { type: [String], default: [] },

    totalServiceAmount: { type: Number, default: 0 },
    familyAdvancementAmount: { type: Number, default: 0 },
    vipFee: { type: Number, default: 0 },
    assignmentAmount: { type: Number, default: 0 },

    assignmentUploadPath: { type: String, trim: true },
    otherUploadPaths: { type: [String], default: [] }, // NEW

    status: {
      type: String,
      enum: ["Submitted", "Verifying", "Approved", "Funded", "Closed"],
      default: "Submitted",
      index: true,
    },
  },
  { timestamps: true }
);

// helpful compound index for admin lists
FundingRequestSchema.index({ ownerId: 1, createdAt: -1 });

export const FundingRequest =
  (mongoose.models.FundingRequest as mongoose.Model<IFundingRequest>) ||
  mongoose.model<IFundingRequest>("FundingRequest", FundingRequestSchema);

export default FundingRequest;
