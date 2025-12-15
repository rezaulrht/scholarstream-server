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
    const reviewCollection = database.collection("reviews");
    await client.connect();
    await client.db("admin").command({ ping: 1 });

    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        console.log("Attempting to create user:", user);

        const query = { email: user.email };
        const existingUserCursor = await userCollection.find(query);
        const existingUserArray = await existingUserCursor.toArray();
        const existingUser =
          existingUserArray.length > 0 ? existingUserArray[0] : null;
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

    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const userCursor = await userCollection.find({ email: email });
        const userArray = await userCursor.toArray();
        const user = userArray.length > 0 ? userArray[0] : null;
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }
        res.send(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send({
          message: "Failed to fetch user",
          error: error.message,
        });
      }
    });

    app.patch("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const { displayName, photoURL } = req.body;

        const result = await userCollection.updateOne(
          { email: email },
          {
            $set: {
              displayName: displayName,
              photoURL: photoURL,
            },
          }
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send({
          message: "Failed to update user",
          error: error.message,
        });
      }
    });

    app.get("/scholarships", async (req, res) => {
      const scholarshipsCursor = await scholarshipCollection.find();
      const scholarships = await scholarshipsCursor.toArray();
      res.send(scholarships);
    });

    app.get("/scholarships/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const scholarshipCursor = await scholarshipCollection.find(query);
      const scholarshipArray = await scholarshipCursor.toArray();
      const scholarship =
        scholarshipArray.length > 0 ? scholarshipArray[0] : null;
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

        const existingApplicationCursor = await applicationCollection.find({
          scholarshipId: application.scholarshipId,
          userEmail: application.userEmail,
        });
        const existingApplicationArray =
          await existingApplicationCursor.toArray();
        const existingApplication =
          existingApplicationArray.length > 0
            ? existingApplicationArray[0]
            : null;

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
      const applicationsCursor = await applicationCollection.find();
      const applications = await applicationsCursor.toArray();
      res.send(applications);
    });

    app.get("/applications/user/:email", async (req, res) => {
      const email = req.params.email;
      const applicationsCursor = await applicationCollection.find({
        userEmail: email,
      });
      const applications = await applicationsCursor.toArray();
      res.send(applications);
    });

    // Get applications for moderators (paid only)
    app.get("/applications/moderator", async (req, res) => {
      try {
        const applicationsCursor = await applicationCollection.find({
          paymentStatus: "paid",
        });
        const applications = await applicationsCursor.toArray();
        res.send(applications);
      } catch (error) {
        console.error("Error fetching moderator applications:", error);
        res.status(500).send({
          message: "Failed to fetch applications",
          error: error.message,
        });
      }
    });

    // Update application feedback
    app.patch("/applications/:id/feedback", async (req, res) => {
      try {
        const id = req.params.id;
        const { feedback } = req.body;

        const result = await applicationCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              feedback: feedback,
            },
          }
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating feedback:", error);
        res.status(500).send({
          message: "Failed to update feedback",
          error: error.message,
        });
      }
    });

    // Update application status
    app.patch("/applications/:id/status", async (req, res) => {
      try {
        const id = req.params.id;
        const { applicationStatus } = req.body;

        const result = await applicationCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              applicationStatus: applicationStatus,
            },
          }
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).send({
          message: "Failed to update status",
          error: error.message,
        });
      }
    });

    // Delete application (only if pending)
    app.delete("/applications/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const applicationCursor = await applicationCollection.find({
          _id: new ObjectId(id),
        });
        const applicationArray = await applicationCursor.toArray();
        const application =
          applicationArray.length > 0 ? applicationArray[0] : null;

        if (!application) {
          return res.status(404).send({ message: "Application not found" });
        }

        if (application.applicationStatus !== "pending") {
          return res
            .status(400)
            .send({ message: "Cannot delete application that is not pending" });
        }

        const result = await applicationCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        console.error("Error deleting application:", error);
        res.status(500).send({
          message: "Failed to delete application",
          error: error.message,
        });
      }
    });

    // Review endpoints
    app.get("/reviews", async (req, res) => {
      try {
        const reviewsCursor = await reviewCollection.find();
        const reviews = await reviewsCursor.toArray();
        res.send(reviews);
      } catch (error) {
        console.error("Error fetching all reviews:", error);
        res.status(500).send({
          message: "Failed to fetch reviews",
          error: error.message,
        });
      }
    });

    app.post("/reviews", async (req, res) => {
      try {
        const review = req.body;
        const result = await reviewCollection.insertOne(review);
        res.send(result);
      } catch (error) {
        console.error("Error creating review:", error);
        res.status(500).send({
          message: "Failed to create review",
          error: error.message,
        });
      }
    });

    app.get("/reviews/user/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const reviewsCursor = await reviewCollection.find({ userEmail: email });
        const reviews = await reviewsCursor.toArray();
        res.send(reviews);
      } catch (error) {
        console.error("Error fetching user reviews:", error);
        res.status(500).send({
          message: "Failed to fetch reviews",
          error: error.message,
        });
      }
    });

    app.patch("/reviews/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { ratingPoint, reviewComment } = req.body;

        const result = await reviewCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              ratingPoint: ratingPoint,
              reviewComment: reviewComment,
              reviewDate: new Date(),
            },
          }
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating review:", error);
        res.status(500).send({
          message: "Failed to update review",
          error: error.message,
        });
      }
    });

    app.delete("/reviews/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await reviewCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        console.error("Error deleting review:", error);
        res.status(500).send({
          message: "Failed to delete review",
          error: error.message,
        });
      }
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
