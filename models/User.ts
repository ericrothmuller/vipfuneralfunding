import { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  email: { type: String, unique: true, required: true, index: true },
  passwordHash: { type: String, required: true }, // bcrypt hash
}, { timestamps: true });

export const User = models.User || model("User", UserSchema);
