const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    scholarshipId: { type: String, required: true },
    scholarshipName: String,
    universityName: String,
    scholarshipCategory: String,
    degree: String,
    applicationFees: Number,
    serviceCharge: Number,
    totalAmount: Number,
    userEmail: { type: String, required: true },
    userName: String,
    userPhoto: String,
    phone: String,
    dateOfBirth: String,
    gender: String,
    currentUniversity: String,
    cgpa: Number,
    applicationStatus: {
      type: String,
      enum: ["pending", "processing", "accepted", "rejected", "needs revision"],
      default: "pending",
    },
    paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
    transactionId: String,
    feedback: String,
    appliedDate: { type: Date, default: Date.now },
  },
  { versionKey: false, strict: false }
);

module.exports = mongoose.model("Application", applicationSchema, "applications");
