// models/User.ts
import { Schema, model, models, InferSchemaType, Model } from "mongoose";

const UserSchema = new Schema(
  {
    // Auth
    email: { type: String, unique: true, required: true, index: true },
    passwordHash: { type: String, required: true },

    // Profile fields
    fhName: { type: String, default: "" },           // FH/CEM Name
    businessPhone: { type: String, default: "" },
    businessFax: { type: String, default: "" },
    mailingAddress: { type: String, default: "" },

    // NEW profile fields
    contactName: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// In TS, this infers the shape of a document from the schema
export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
