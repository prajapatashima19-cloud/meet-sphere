import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String }, 
    email: { type: String, required: true, unique: true },
    googleId: { type: String },
    githubId: { type: String },
    avatar: { type: String },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export { User };


