// config/db.js
const { MongoClient, ServerApiVersion } = require("mongodb");

let db;

async function connectDB() {
  const client = new MongoClient(process.env.MONGODB_URI, {
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
  return {
    userCollection: db.collection("users"),
    scholarshipCollection: db.collection("scholarships"),
    applicationCollection: db.collection("applications"),
    reviewCollection: db.collection("reviews"),
  };
}

module.exports = { connectDB, getCollections };
