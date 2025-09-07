// models/User.ts
import mongoose, { Schema, Types } from "mongoose";

export type Role = "ADMIN" | "FH_CEM" | "NEW";

export interface IUser {
  email: string;
  passwordHash: string;
  role: Role;
  fhName?: string; // (legacy string, optional)
  fhCemId?: Types.ObjectId | null; // NEW: reference to FHCem
  businessPhone?: string;
  businessFax?: string;
  mailingAddress?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["ADMIN", "FH_CEM", "NEW"], default: "NEW", index: true },
    fhName: { type: String, trim: true },
    fhCemId: { type: Schema.Types.ObjectId, ref: "FHCem", default: null, index: true },
    businessPhone: { type: String, trim: true },
    businessFax: { type: String, trim: true },
    mailingAddress: { type: String, trim: true },
    contactName: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export default (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);
