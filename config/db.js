// config/db.js
const { MongoClient, ServerApiVersion } = require("mongodb");

let client;
let db;

async function connectDB() {
  if (db) return; // already connected
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  await client.connect();
  db = client.db("scholarstreams");
  console.log("Connected to MongoDB");
}

function getCollections() {
  if (!db) {
    throw new Error(
      "getCollections() called before connectDB() completed. Ensure connectDB() is awaited at startup."
    );
  }
  return {
    userCollection: db.collection("users"),
    scholarshipCollection: db.collection("scholarships"),
    applicationCollection: db.collection("applications"),
    reviewCollection: db.collection("reviews"),
  };
}

module.exports = { connectDB, getCollections };
