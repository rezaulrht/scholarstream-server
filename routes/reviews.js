// routes/reviews.js
const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { getCollections } = require("../config/db");
const { verifyFirebaseToken, verifyModerator } = require("../middleware/auth");

router.get("/reviews/public", async (req, res) => {
  try {
    const { reviewCollection } = getCollections();
    const limit = parseInt(req.query.limit) || 10;
    const reviews = await reviewCollection.find().sort({ reviewDate: -1 }).limit(limit).toArray();
    res.send(reviews);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch reviews", error: error.message });
  }
});

router.get("/reviews/scholarship/:scholarshipId", async (req, res) => {
  try {
    const { reviewCollection } = getCollections();
    const reviews = await reviewCollection
      .find({ scholarshipId: req.params.scholarshipId })
      .sort({ reviewDate: -1 })
      .toArray();
    res.send(reviews);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch reviews", error: error.message });
  }
});

router.get("/reviews/user/:email", verifyFirebaseToken, async (req, res) => {
  try {
    const { reviewCollection } = getCollections();
    const email = req.params.email;
    if (email !== req.decoded_email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const reviews = await reviewCollection.find({ userEmail: email }).toArray();
    res.send(reviews);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch reviews", error: error.message });
  }
});

router.get("/reviews", verifyFirebaseToken, verifyModerator, async (req, res) => {
  try {
    const { reviewCollection } = getCollections();
    const reviews = await reviewCollection.find().toArray();
    res.send(reviews);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch reviews", error: error.message });
  }
});

router.post("/reviews", verifyFirebaseToken, async (req, res) => {
  try {
    const { reviewCollection } = getCollections();
    const review = req.body;
    const email = req.decoded_email;
    if (review.userEmail !== email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const result = await reviewCollection.insertOne(review);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to create review", error: error.message });
  }
});

router.patch("/reviews/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const { reviewCollection } = getCollections();
    const id = req.params.id;
    const { ratingPoint, reviewComment } = req.body;
    const email = req.decoded_email;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid review ID" });
    }
    const review = await reviewCollection.findOne({ _id: new ObjectId(id) });
    if (!review) return res.status(404).send({ message: "Review not found" });
    if (review.userEmail !== email) return res.status(403).send({ message: "Forbidden Access" });
    const result = await reviewCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ratingPoint, reviewComment, reviewDate: new Date() } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update review", error: error.message });
  }
});

router.delete("/reviews/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const { reviewCollection, userCollection } = getCollections();
    const id = req.params.id;
    const email = req.decoded_email;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid review ID" });
    }
    const review = await reviewCollection.findOne({ _id: new ObjectId(id) });
    if (!review) return res.status(404).send({ message: "Review not found" });
    const user = await userCollection.findOne({ email });
    const isModerator = user?.role === "moderator" || user?.role === "admin";
    const isOwner = review.userEmail === email;
    if (!isOwner && !isModerator) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const result = await reviewCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete review", error: error.message });
  }
});

module.exports = router;
