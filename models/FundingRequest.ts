// models/FundingRequest.ts
import mongoose, { Schema, Types } from "mongoose";

export type FundingStatus = "Submitted" | "Verifying" | "Approved" | "Funded" | "Closed";

export interface IFundingRequest {
  _id?: Types.ObjectId;

  // ownership / relations
  ownerId: Types.ObjectId;
  userId?: Types.ObjectId; // legacy owner
  insuranceCompanyId?: Types.ObjectId | null;
  fhCemId?: Types.ObjectId | null;

  // FH/CEM snapshot
  fhName?: string;
  fhRep?: string;
  contactPhone?: string;
  contactEmail?: string;

  // decedent
  decFirstName?: string;
  decLastName?: string;
  decSSN?: string;
  decDOB?: Date | null;
  decDOD?: Date | null;
  decMaritalStatus?: string;

  // address
  decAddress?: string;
  decCity?: string;
  decState?: string;
  decZip?: string;

  // place of death
  decPODCity?: string;
  decPODState?: string;
  decPODCountry?: string;
  deathInUS?: boolean;

  // COD flags
  codNatural?: boolean;
  codAccident?: boolean;
  codHomicide?: boolean;
  codPending?: boolean;
  codSuicide?: boolean;

  // certificate
  hasFinalDC?: boolean;

  // employer
  employerPhone?: string;
  employerContact?: string;
  employmentStatus?: string;
  employerRelation?: "Employee" | "Dependent" | string;

  // insurance details
  otherInsuranceCompany?: {
    name?: string;
    phone?: string;
    fax?: string;
    notes?: string;
  } | null;
  insuranceCompany?: string;               // legacy display
  policyNumbers?: string[];                // aggregated
  beneficiaries?: string[];                // aggregated
  faceAmount?: string;                     // aggregated formatted
  policyBeneficiaries?: any;               // BeneficiaryDetail[][] (kept flexible)
  policies?: Array<{
    policyNumber?: string;
    faceAmount?: string;                   // formatted per-policy
  }>;

  // financials (numbers)
  totalServiceAmount?: number;
  familyAdvancementAmount?: number;
  vipFee?: number;
  assignmentAmount?: number;

  // uploads
  assignmentUploadPath?: string;           // legacy single
  assignmentUploadPaths?: string[];        // multiple assignments
  otherUploadPaths?: string[];             // multiple others

  // workflow
  status: FundingStatus;

  // timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

const FundingRequestSchema = new Schema<IFundingRequest>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userId:  { type: Schema.Types.ObjectId, ref: "User", index: true, default: null },
    insuranceCompanyId: { type: Schema.Types.ObjectId, ref: "InsuranceCompany", default: null, index: true },
    fhCemId: { type: Schema.Types.ObjectId, ref: "FHCem", default: null, index: true },

    fhName: { type: String, trim: true },
    fhRep:  { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    contactEmail: { type: String, trim: true },

    decFirstName: { type: String, trim: true },
    decLastName:  { type: String, trim: true },
    decSSN:       { type: String, trim: true },
    decDOB:       { type: Date },
    decDOD:       { type: Date },
    decMaritalStatus: { type: String, trim: true },

    decAddress: { type: String, trim: true },
    decCity:    { type: String, trim: true },
    decState:   { type: String, trim: true },
    decZip:     { type: String, trim: true },

    decPODCity:    { type: String, trim: true },
    decPODState:   { type: String, trim: true },
    decPODCountry: { type: String, trim: true },
    deathInUS:     { type: Boolean, default: undefined },

    codNatural:  { type: Boolean, default: undefined },
    codAccident: { type: Boolean, default: undefined },
    codHomicide: { type: Boolean, default: undefined },
    codPending:  { type: Boolean, default: undefined },
    codSuicide:  { type: Boolean, default: undefined },

    hasFinalDC: { type: Boolean, default: undefined },

    employerPhone:   { type: String, trim: true },
    employerContact: { type: String, trim: true },
    employmentStatus:{ type: String, trim: true },
    employerRelation:{ type: String, trim: true },

    otherInsuranceCompany: {
      name:  { type: String, trim: true },
      phone: { type: String, trim: true },
      fax:   { type: String, trim: true },
      notes: { type: String, trim: true },
    },

    insuranceCompany: { type: String, trim: true },

    policyNumbers: { type: [String], default: [] },
    beneficiaries: { type: [String], default: [] },
    faceAmount:    { type: String, trim: true },

    policyBeneficiaries: { type: Schema.Types.Mixed, default: [] },
    policies: [{
      policyNumber: { type: String, trim: true },
      faceAmount:   { type: String, trim: true },
    }],

    totalServiceAmount: { type: Number, default: 0 },
    familyAdvancementAmount: { type: Number, default: 0 },
    vipFee: { type: Number, default: 0 },
    assignmentAmount: { type: Number, default: 0 },

    assignmentUploadPath: { type: String, trim: true },
    assignmentUploadPaths: { type: [String], default: [] },
    otherUploadPaths: { type: [String], default: [] },

    status: {
      type: String,
      enum: ["Submitted", "Verifying", "Approved", "Funded", "Closed"],
      default: "Submitted",
      index: true,
    },
  },
  { timestamps: true }
);

FundingRequestSchema.index({ ownerId: 1, createdAt: -1 });

export const FundingRequest =
  (mongoose.models.FundingRequest as mongoose.Model<IFundingRequest>) ||
  mongoose.model<IFundingRequest>("FundingRequest", FundingRequestSchema);

export default FundingRequest;
