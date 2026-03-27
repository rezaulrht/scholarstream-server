const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    scholarshipId: { type: String, required: true },
    scholarshipName: String,
    universityName: String,
    userEmail: { type: String, required: true },
    userName: String,
    userPhoto: String,
    ratingPoint: { type: Number, min: 1, max: 5 },
    reviewComment: String,
    reviewDate: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model("Review", reviewSchema, "reviews");
