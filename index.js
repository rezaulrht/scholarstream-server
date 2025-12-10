const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();
require("dotenv").config();


app.use(express.json());
app.use(cors());

const verifyFirebaseToken = (req,res,next) => {
  console.log('headers in the middleware', req.headers.authorization) 

  next();
}

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        console.log("Attempting to create user:", user);

        const query = { email: user.email };
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          console.log("User already exists:", user.email);
          return res.send({ message: 'user already exists', insertedId: null });
        }
        user.role = "student";
        user.createdAt = new Date();
        const result = await userCollection.insertOne(user);
        console.log("User stored successfully:", result);
        res.send(result);
      } catch (error) {
        console.error("Error storing user:", error);
        res.status(500).send({ message: "Failed to store user", error: error.message });
      }
    })

    app.get("/scholarships", async (req, res) => {
      const scholarships = await scholarshipCollection.find().toArray();
      res.send(scholarships);
    })

    app.get('/scholarships/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const scholarship = await scholarshipCollection.findOne(query);
      res.send(scholarship);
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
