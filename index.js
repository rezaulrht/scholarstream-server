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

    // ==========================================
    // Middleware
    // ==========================================
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded_email;
      if (!email) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      const user = await userCollection.findOne({ email: email });
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    const verifyModerator = async (req, res, next) => {
      const email = req.decoded_email;
      if (!email) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      const user = await userCollection.findOne({ email: email });
      if (user?.role !== "moderator" && user?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    // ==========================================
    // Public Endpoints
    // ==========================================

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

    // Get scholarships with search, filter, sort, and pagination
    app.get("/scholarships", async (req, res) => {
      try {
        const {
          search,
          country,
          category,
          sortBy,
          sortOrder,
          page = 1,
          limit = 10,
        } = req.query;

        // Build query object
        const query = {};

        // Search by scholarship name, university name, or degree
        if (search) {
          query.$or = [
            { scholarshipName: { $regex: search, $options: "i" } },
            { universityName: { $regex: search, $options: "i" } },
            { degree: { $regex: search, $options: "i" } },
          ];
        }

        // Filter by country
        if (country) {
          query.universityCountry = country;
        }

        // Filter by category
        if (category) {
          query.scholarshipCategory = category;
        }

        // Build sort object
        let sort = {};
        if (sortBy === "fees") {
          sort.applicationFees = sortOrder === "desc" ? -1 : 1;
        } else if (sortBy === "deadline") {
          sort.applicationDeadline = sortOrder === "desc" ? -1 : 1;
        } else {
          // Default sort by posted date (newest first)
          sort.postedDate = -1;
        }

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count for pagination
        const totalCount = await scholarshipCollection.countDocuments(query);

        // Fetch scholarships
        const scholarships = await scholarshipCollection
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .toArray();

        res.send({
          scholarships,
          totalCount,
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
        });
      } catch (error) {
        console.error("Error fetching scholarships:", error);
        res.status(500).send({
          message: "Failed to fetch scholarships",
          error: error.message,
        });
      }
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

    // Get reviews by scholarship (Public)
    app.get("/reviews/scholarship/:scholarshipId", async (req, res) => {
      try {
        const scholarshipId = req.params.scholarshipId;
        const reviewsCursor = await reviewCollection
          .find({
            scholarshipId: scholarshipId,
          })
          .sort({ reviewDate: -1 });
        const reviews = await reviewsCursor.toArray();
        res.send(reviews);
      } catch (error) {
        console.error("Error fetching scholarship reviews:", error);
        res.status(500).send({
          message: "Failed to fetch reviews",
          error: error.message,
        });
      }
    });

    // Get public reviews for homepage (Public)
    app.get("/reviews/public", async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 10;
        const reviewsCursor = await reviewCollection
          .find()
          .sort({ reviewDate: -1 })
          .limit(limit);
        const reviews = await reviewsCursor.toArray();
        res.send(reviews);
      } catch (error) {
        console.error("Error fetching public reviews:", error);
        res.status(500).send({
          message: "Failed to fetch reviews",
          error: error.message,
        });
      }
    });

    // Get all reviews (Moderator only)
    app.get(
      "/reviews",
      verifyFirebaseToken,
      verifyModerator,
      async (req, res) => {
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
      }
    );

    // ==========================================
    // Authenticated User Endpoints
    // ==========================================

    // Get user role
    app.get("/user/:email/role", verifyFirebaseToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded_email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send({ role: user?.role || "student" });
    });

    // Get user profile
    app.get("/users/:email", verifyFirebaseToken, async (req, res) => {
      try {
        const email = req.params.email;
        if (email !== req.decoded_email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
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

    // Update user profile
    app.patch("/users/:email", verifyFirebaseToken, async (req, res) => {
      try {
        const email = req.params.email;
        if (email !== req.decoded_email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
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

    // Create Application
    app.post("/applications", verifyFirebaseToken, async (req, res) => {
      try {
        const application = req.body;
        const email = req.decoded_email;

        // Verify the user is creating application for themselves
        if (application.userEmail !== email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }

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

    // Get user applications
    app.get(
      "/applications/user/:email",
      verifyFirebaseToken,
      async (req, res) => {
        const email = req.params.email;
        if (email !== req.decoded_email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
        const applicationsCursor = await applicationCollection.find({
          userEmail: email,
        });
        const applications = await applicationsCursor.toArray();
        res.send(applications);
      }
    );

    // Get single application (for checkout page)
    app.get("/applications/:id", verifyFirebaseToken, async (req, res) => {
      try {
        const id = req.params.id;
        const email = req.decoded_email;

        const application = await applicationCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!application) {
          return res.status(404).send({ message: "Application not found" });
        }

        // Verify ownership
        if (application.userEmail !== email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }

        res.send(application);
      } catch (error) {
        console.error("Error fetching application:", error);
        res.status(500).send({
          message: "Failed to fetch application",
          error: error.message,
        });
      }
    });

    // Create Review
    app.post("/reviews", verifyFirebaseToken, async (req, res) => {
      try {
        const review = req.body;
        const email = req.decoded_email;

        // Verify the user is creating review for themselves
        if (review.userEmail !== email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }

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

    // Get user reviews
    app.get("/reviews/user/:email", verifyFirebaseToken, async (req, res) => {
      try {
        const email = req.params.email;
        if (email !== req.decoded_email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
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

    // Update own review
    app.patch("/reviews/:id", verifyFirebaseToken, async (req, res) => {
      try {
        const id = req.params.id;
        const { ratingPoint, reviewComment } = req.body;
        const email = req.decoded_email;

        // Verify ownership
        const review = await reviewCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!review) {
          return res.status(404).send({ message: "Review not found" });
        }
        if (review.userEmail !== email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }

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

    // Delete review (User can delete own, Moderator can delete any)
    app.delete("/reviews/:id", verifyFirebaseToken, async (req, res) => {
      try {
        const id = req.params.id;
        const email = req.decoded_email;

        // Get the review to check ownership
        const review = await reviewCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!review) {
          return res.status(404).send({ message: "Review not found" });
        }

        // Check if user is the owner or a moderator/admin
        const user = await userCollection.findOne({ email: email });
        const isModerator =
          user?.role === "moderator" || user?.role === "admin";
        const isOwner = review.userEmail === email;

        if (!isOwner && !isModerator) {
          return res.status(403).send({ message: "Forbidden Access" });
        }

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

    // Update application (pending only)
    app.patch("/applications/:id", verifyFirebaseToken, async (req, res) => {
      try {
        const id = req.params.id;
        const email = req.decoded_email;
        const { phone, dateOfBirth, gender, currentUniversity, cgpa } =
          req.body;

        const application = await applicationCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!application) {
          return res.status(404).send({ message: "Application not found" });
        }

        // Verify ownership
        if (application.userEmail !== email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }

        // Only allow editing if status is pending
        if (application.applicationStatus !== "pending") {
          return res.status(400).send({
            message: "Cannot edit application that is not pending",
          });
        }

        const result = await applicationCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              phone,
              dateOfBirth,
              gender,
              currentUniversity,
              cgpa,
            },
          }
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating application:", error);
        res.status(500).send({
          message: "Failed to update application",
          error: error.message,
        });
      }
    });

    // Delete application (pending only)
    app.delete("/applications/:id", verifyFirebaseToken, async (req, res) => {
      try {
        const id = req.params.id;
        const email = req.decoded_email;

        const applicationCursor = await applicationCollection.find({
          _id: new ObjectId(id),
        });
        const applicationArray = await applicationCursor.toArray();
        const application =
          applicationArray.length > 0 ? applicationArray[0] : null;

        if (!application) {
          return res.status(404).send({ message: "Application not found" });
        }

        // Verify ownership
        if (application.userEmail !== email) {
          return res.status(403).send({ message: "Forbidden Access" });
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

    // Payment Intent
    app.post(
      "/create-checkout-session",
      verifyFirebaseToken,
      async (req, res) => {
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
      }
    );

    app.patch("/payment-success", verifyFirebaseToken, async (req, res) => {
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

    // ==========================================
    // Moderator Endpoints
    // ==========================================

    // Get applications for moderators (paid only)
    app.get(
      "/applications/moderator",
      verifyFirebaseToken,
      verifyModerator,
      async (req, res) => {
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
      }
    );

    // Update application feedback
    app.patch(
      "/applications/:id/feedback",
      verifyFirebaseToken,
      verifyModerator,
      async (req, res) => {
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
      }
    );

    // Update application status
    app.patch(
      "/applications/:id/status",
      verifyFirebaseToken,
      verifyModerator,
      async (req, res) => {
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
      }
    );

    // ==========================================
    // Admin Endpoints
    // ==========================================

    // Get all users
    app.get("/users", verifyFirebaseToken, verifyAdmin, async (req, res) => {
      try {
        const usersCursor = await userCollection.find();
        const users = await usersCursor.toArray();
        res.send(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({
          message: "Failed to fetch users",
          error: error.message,
        });
      }
    });

    // Update user role
    app.patch(
      "/users/:id/role",
      verifyFirebaseToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const { role } = req.body;

          if (!["student", "moderator", "admin"].includes(role)) {
            return res.status(400).send({ message: "Invalid role" });
          }

          const result = await userCollection.updateOne(
            { _id: new ObjectId(id) },
            {
              $set: {
                role: role,
              },
            }
          );

          if (result.matchedCount === 0) {
            return res.status(404).send({ message: "User not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating user role:", error);
          res.status(500).send({
            message: "Failed to update user role",
            error: error.message,
          });
        }
      }
    );

    // Delete user
    app.delete(
      "/users/:id",
      verifyFirebaseToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const result = await userCollection.deleteOne({
            _id: new ObjectId(id),
          });

          if (result.deletedCount === 0) {
            return res.status(404).send({ message: "User not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error deleting user:", error);
          res.status(500).send({
            message: "Failed to delete user",
            error: error.message,
          });
        }
      }
    );

    // Add Scholarship
    app.post(
      "/add-scholarship",
      verifyFirebaseToken,
      verifyAdmin,
      async (req, res) => {
        const scholarship = req.body;
        const result = await scholarshipCollection.insertOne(scholarship);
        res.send(result);
      }
    );

    // Update scholarship
    app.patch(
      "/scholarships/:id",
      verifyFirebaseToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const scholarshipData = req.body;

          const result = await scholarshipCollection.updateOne(
            { _id: new ObjectId(id) },
            {
              $set: scholarshipData,
            }
          );

          if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Scholarship not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error updating scholarship:", error);
          res.status(500).send({
            message: "Failed to update scholarship",
            error: error.message,
          });
        }
      }
    );

    // Delete scholarship
    app.delete(
      "/scholarships/:id",
      verifyFirebaseToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const result = await scholarshipCollection.deleteOne({
            _id: new ObjectId(id),
          });

          if (result.deletedCount === 0) {
            return res.status(404).send({ message: "Scholarship not found" });
          }

          res.send(result);
        } catch (error) {
          console.error("Error deleting scholarship:", error);
          res.status(500).send({
            message: "Failed to delete scholarship",
            error: error.message,
          });
        }
      }
    );

    // Get all applications (Admin view?) - The user requirement asked for grouping
    // I noticed `app.get("/applications")` in original.
    // It's likely for Admin since public shouldn't see all.
    app.get(
      "/applications",
      verifyFirebaseToken,
      verifyAdmin,
      async (req, res) => {
        const applicationsCursor = await applicationCollection.find();
        const applications = await applicationsCursor.toArray();
        res.send(applications);
      }
    );

    // Analytics
    app.get(
      "/analytics",
      verifyFirebaseToken,
      verifyAdmin,
      async (req, res) => {
        try {
          // Get total users
          const totalUsersCursor = await userCollection.find();
          const totalUsersArray = await totalUsersCursor.toArray();
          const totalUsers = totalUsersArray.length;

          // Get total scholarships
          const totalScholarshipsCursor = await scholarshipCollection.find();
          const totalScholarshipsArray =
            await totalScholarshipsCursor.toArray();
          const totalScholarships = totalScholarshipsArray.length;

          // Get total fees collected (from paid applications)
          const paidApplicationsCursor = await applicationCollection.find({
            paymentStatus: "paid",
          });
          const paidApplications = await paidApplicationsCursor.toArray();
          let totalFeesCollected = 0;
          for (const appl of paidApplications) {
            totalFeesCollected += appl.totalAmount || 0;
          }

          // Get applications count by university
          const applicationsByUniversityCursor =
            await applicationCollection.find();
          const allApplications =
            await applicationsByUniversityCursor.toArray();
          const universityCounts = {};
          allApplications.forEach((app) => {
            const uni = app.universityName;
            universityCounts[uni] = (universityCounts[uni] || 0) + 1;
          });
          const applicationsByUniversity = Object.entries(universityCounts).map(
            ([name, count]) => ({ name, count })
          );

          // Get applications count by scholarship category
          const categoryCounts = {};
          allApplications.forEach((app) => {
            const cat = app.scholarshipCategory;
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          });
          const applicationsByCategory = Object.entries(categoryCounts).map(
            ([name, count]) => ({ name, count })
          );

          res.send({
            totalUsers,
            totalScholarships,
            totalFeesCollected,
            applicationsByUniversity,
            applicationsByCategory,
          });
        } catch (error) {
          console.error("Error fetching analytics:", error);
          res.status(500).send({
            message: "Failed to fetch analytics",
            error: error.message,
          });
        }
      }
    );

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
