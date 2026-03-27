const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    displayName: String,
    photoURL: String,
    role: { type: String, enum: ["student", "moderator", "admin"], default: "student" },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model("User", userSchema, "users");
