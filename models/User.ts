// models/User.ts
import { Schema, model, models, InferSchemaType, Model } from "mongoose";

const UserSchema = new Schema({
  email: { type: String, unique: true, required: true, index: true },
  passwordHash: { type: String, required: true },

  // NEW profile fields
  fhName: { type: String, default: "" },           // FH/CEM Name
  businessPhone: { type: String, default: "" },
  businessFax: { type: String, default: "" },
  mailingAddress: { type: String, default: "" },
}, { timestamps: true });

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
