const mongoose = require("mongoose");

// strict: false preserves any extra fields the client sends
const scholarshipSchema = new mongoose.Schema(
  {
    scholarshipName: String,
    universityName: String,
    universityLogo: String,
    universityCountry: String,
    universityCity: String,
    universityWorldRank: Number,
    scholarshipCategory: String,
    subjectCategory: String,
    description: String,
    stipend: Number,
    applicationFees: Number,
    serviceCharge: Number,
    applicationDeadline: Date,
    degree: String,
    postedDate: { type: Date, default: Date.now },
    postedUserEmail: String,
  },
  { versionKey: false, strict: false }
);

module.exports = mongoose.model("Scholarship", scholarshipSchema, "scholarships");
