// models/FHLinkRequest.ts
import mongoose, { Schema, Types } from "mongoose";

export interface IFHLinkRequest {
  userId: Types.ObjectId;      // who is requesting
  requestedName: string;       // free-typed FH/CEM name from user
  status: "Pending" | "Approved" | "Rejected";
  createdAt?: Date;
  updatedAt?: Date;
}

const FHLinkRequestSchema = new Schema<IFHLinkRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    requestedName: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending", index: true },
  },
  { timestamps: true }
);

export default (mongoose.models.FHLinkRequest as mongoose.Model<IFHLinkRequest>) ||
  mongoose.model<IFHLinkRequest>("FHLinkRequest", FHLinkRequestSchema);
