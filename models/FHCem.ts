// models/FHCem.ts
import mongoose, { Schema, Types } from "mongoose";

export interface IFHCem {
  name: string;                    // FH/CEM Name
  reps?: string[];                 // FH/CEM Reps (names or emails)
  phone?: string;                  // FH/CEM Phone
  email?: string;                  // FH/CEM Email
  fax?: string;                    // FH/CEM Fax
  mailingAddress?: string;         // FH/CEM Mailing Address
  notes?: string;                  // FH/CEM Notes
  createdAt?: Date;
  updatedAt?: Date;
}

const FHCemSchema = new Schema<IFHCem>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    reps: [{ type: String, trim: true }],
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    fax: { type: String, trim: true },
    mailingAddress: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export default (mongoose.models.FHCem as mongoose.Model<IFHCem>) ||
  mongoose.model<IFHCem>("FHCem", FHCemSchema);
