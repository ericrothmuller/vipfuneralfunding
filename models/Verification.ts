// models/Verification.ts
import { Schema, model, models, InferSchemaType, Model } from "mongoose";

const VerificationSchema = new Schema(
  {
    fundingRequestId: { type: Schema.Types.ObjectId, ref: "FundingRequest", unique: true, required: true },

    // Snapshot (auto-populated from Funding Request when first saved/updated)
    insuranceCompany: { type: String, default: "" },
    policyNumbers: { type: String, default: "" },
    insuredFirstName: { type: String, default: "" },
    insuredLastName: { type: String, default: "" },
    insuredSSN: { type: String, default: "" },

    // Admin-entered answers
    active: { type: Boolean, default: false },
    inForce: { type: Boolean, default: false },
    receivedAssignment: { type: Boolean, default: false },
    primaryBeneficiaries: { type: String, default: "" },
    contingentBeneficiaries: { type: String, default: "" },
    acceptsThirdPartyAssignments: { type: Boolean, default: false },
    otherAssignments: { type: Boolean, default: false },
    claimAlreadyFiled: { type: Boolean, default: false },
    assignmentSignedByBenes: { type: Boolean, default: false },
    policyType: { type: String, default: "" },
    issueDate: { type: Date, default: null },
    reinstated: { type: Boolean, default: false },
    contestable: { type: Boolean, default: false },
    faceAmount: { type: String, default: "" },
    loans: { type: String, default: "" },
    totalBenefitAmount: { type: String, default: "" },
    signingBenesPortionCoverAssignment: { type: Boolean, default: false },
    documentsNeeded: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export type VerificationDoc = InferSchemaType<typeof VerificationSchema>;

export const Verification: Model<VerificationDoc> =
  (models.Verification as Model<VerificationDoc>) ||
  model<VerificationDoc>("Verification", VerificationSchema);
