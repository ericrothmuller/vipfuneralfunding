// models/FundingRequest.ts
import { Schema, model, models, InferSchemaType, Model } from "mongoose";

const FundingRequestSchema = new Schema(
  {
    // ownership
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },

    // Funeral Home / Cemetery
    fhName: { type: String, default: "" },
    fhRep: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    contactEmail: { type: String, default: "" },

    // Decedent
    decFirstName: { type: String, default: "" },
    decLastName: { type: String, default: "" },
    decSSN: { type: String, default: "" },
    decDOB: { type: Date, default: null },
    decDOD: { type: Date, default: null },
    decMaritalStatus: { type: String, default: "" },

    // Address
    decAddress: { type: String, default: "" },
    decCity: { type: String, default: "" },
    decState: { type: String, default: "" },
    decZip: { type: String, default: "" },

    // Place of death
    decPODCity: { type: String, default: "" },
    decPODState: { type: String, default: "" },
    deathInUS: { type: Boolean, default: true },

    // Cause of death
    codNatural: { type: Boolean, default: false },
    codAccident: { type: Boolean, default: false },
    codHomicide: { type: Boolean, default: false },
    codPending: { type: Boolean, default: false },
    codSuicide: { type: Boolean, default: false },

    // Certificates / assignments
    hasFinalDC: { type: Boolean, default: false },
    otherFHTakingAssignment: { type: Boolean, default: false },
    otherFHName: { type: String, default: "" },
    otherFHAmount: { type: String, default: "" },

    // Employer
    employerPhone: { type: String, default: "" },
    employerContact: { type: String, default: "" },
    employmentStatus: { type: String, default: "" },

    // Insurance
    insuranceCompany: { type: String, default: "" },
    policyNumbers: { type: String, default: "" },
    faceAmount: { type: String, default: "" },
    beneficiaries: { type: String, default: "" },

    // Financials
    totalServiceAmount: { type: String, default: "" },
    familyAdvancementAmount: { type: String, default: "" },
    vipFee: { type: String, default: "" },
    assignmentAmount: { type: String, default: "" },

    // Misc
    notes: { type: String, default: "" },
    assignmentUploadPath: { type: String, default: "" },

    // Workflow status
    status: {
      type: String,
      enum: ["Submitted", "Verifying", "Approved", "Funded", "Closed"],
      default: "Submitted",
      index: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["Submitted", "Verifying", "Approved", "Funded", "Closed"],
          required: true,
        },
        at: { type: Date, default: Date.now },
        by: { type: Schema.Types.ObjectId, ref: "User" }, // admin id
        note: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

export type FundingRequestDoc = InferSchemaType<typeof FundingRequestSchema>;

export const FundingRequest: Model<FundingRequestDoc> =
  (models.FundingRequest as Model<FundingRequestDoc>) ||
  model<FundingRequestDoc>("FundingRequest", FundingRequestSchema);
