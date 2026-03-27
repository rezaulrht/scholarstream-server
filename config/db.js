const mongoose = require("mongoose");

async function connectDB() {
  if (mongoose.connection.readyState !== 0) return; // already connected/connecting
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "scholarstreams" });
  console.log("Connected to MongoDB");
}

module.exports = { connectDB };
