import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  fhName?: string;
  businessPhone?: string;
  businessFax?: string;
  mailingAddress?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fhName: String,
  businessPhone: String,
  businessFax: String,
  mailingAddress: String,
  contactName: String,
  contactPhone: String,
  contactEmail: String,
  notes: String,
});

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
