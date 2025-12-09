const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;

const app = express();

app.use(express.json());
app.use(cors());
require("dotenv").config();

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const database = client.db("scholarstreams");
    const userCollection = database.collection("users");
    const scholarshipCollection = database.collection("scholarships");
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    
    app.post("/user", async (req, res) => {
      
    })

    app.get("/scholarships", async (req, res) => {
      const scholarships = await scholarshipCollection.find().toArray();
      res.send(scholarships);
    })

    app.post("/add-scholarship", async (req, res) => {
      const scholarship = req.body;
      const result = await scholarshipCollection.insertOne(scholarship);
      res.send(result);
    })

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
