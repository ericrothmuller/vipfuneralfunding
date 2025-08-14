// /models/User.ts
import { Schema, model, models, InferSchemaType, Model } from "mongoose";

const UserSchema = new Schema({
  email: { type: String, unique: true, required: true, index: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

export type UserDoc = InferSchemaType<typeof UserSchema>; // { email: string; passwordHash: string; ... }

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
