const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    subscribedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

module.exports = mongoose.model("Subscriber", subscriberSchema, "subscribers");
