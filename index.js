const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(cors());

const admin = require("firebase-admin");

const serviceAccount = require("./scholar-stream-adminsdk-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyFirebaseToken = async (req, res, next) => {
  console.log("headers in the middleware", req.headers.authorization);
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  try {
    const idToken = token.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.decoded_email = decodedToken.email;
    next();
  } catch (err) {
    console.log(err);
    return res.status(401).send({ message: "Unauthorized Access" });
  }
};

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
    const applicationCollection = database.collection("applications");
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
          return res.send({ message: "user already exists", insertedId: null });
        }
        user.role = "student";
        user.createdAt = new Date();
        const result = await userCollection.insertOne(user);
        console.log("User stored successfully:", result);
        res.send(result);
      } catch (error) {
        console.error("Error storing user:", error);
        res
          .status(500)
          .send({ message: "Failed to store user", error: error.message });
      }
    });

    app.get("/scholarships", async (req, res) => {
      const scholarships = await scholarshipCollection.find().toArray();
      res.send(scholarships);
    });

    app.get("/scholarships/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const scholarship = await scholarshipCollection.findOne(query);
      res.send(scholarship);
    });

    app.post("/add-scholarship", async (req, res) => {
      const scholarship = req.body;
      const result = await scholarshipCollection.insertOne(scholarship);
      res.send(result);
    });

    // Applications endpoints
    app.post("/applications", async (req, res) => {
      try {
        const application = req.body;

        const existingApplication = await applicationCollection.findOne({
          scholarshipId: application.scholarshipId,
          userEmail: application.userEmail,
        });

        if (existingApplication) {
          return res.status(400).send({
            message: "You have already applied for this scholarship",
          });
        }

        const result = await applicationCollection.insertOne(application);
        res.send(result);
      } catch (error) {
        console.error("Error creating application:", error);
        res.status(500).send({
          message: "Failed to create application",
          error: error.message,
        });
      }
    });

    app.get("/applications", async (req, res) => {
      const applications = await applicationCollection.find().toArray();
      res.send(applications);
    });

    app.get("/applications/user/:email", async (req, res) => {
      const email = req.params.email;
      const applications = await applicationCollection
        .find({ userEmail: email })
        .toArray();
      res.send(applications);
    });


    // Payment Endpoints
    app.post("/create-checkout-session", async (req, res) => {
      try {
        const paymentInfo = req.body;
        const amount = Math.round(parseFloat(paymentInfo.totalAmount) * 100);

        const session = await stripe.checkout.sessions.create({
          line_items: [
            {
              price_data: {
                currency: "usd",
                unit_amount: amount,
                product_data: {
                  name: paymentInfo.scholarshipName,
                  description: `Application for ${paymentInfo.universityName}`,
                },
              },
              quantity: 1,
            },
          ],
          customer_email: paymentInfo.userEmail,
          mode: "payment",
          metadata: {
            applicationId: paymentInfo.applicationId,
            scholarshipId: paymentInfo.scholarshipId,
            userEmail: paymentInfo.userEmail,
          },
          success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-failed`,
        });

        console.log("Stripe session created:", session.id);
        res.send({ url: session.url });
      } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).send({
          message: "Failed to create payment session",
          error: error.message,
        });
      }
    });

    app.patch("/payment-success", async (req, res) => {
      try {
        const session_id = req.query.session_id;
        const session = await stripe.checkout.sessions.retrieve(session_id);
        console.log("Payment session:", session);

        if (session.payment_status === "paid") {
          const applicationId = session.metadata.applicationId;

          await applicationCollection.updateOne(
            { _id: new ObjectId(applicationId) },
            {
              $set: {
                paymentStatus: "paid",
              },
            }
          );

          res.send({ success: true, session });
        } else {
          res
            .status(400)
            .send({ success: false, message: "Payment not completed" });
        }
      } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).send({ success: false, error: error.message });
      }
    });

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
