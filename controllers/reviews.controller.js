const mongoose = require("mongoose");
const Review = require("../models/Review");
const User = require("../models/User");

const getPublicReviews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const reviews = await Review.find().sort({ reviewDate: -1 }).limit(limit);
    res.send(reviews);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch reviews", error: error.message });
  }
};

const getScholarshipReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ scholarshipId: req.params.scholarshipId }).sort({ reviewDate: -1 });
    res.send(reviews);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch reviews", error: error.message });
  }
};

const getUserReviews = async (req, res) => {
  try {
    const email = req.params.email;
    if (email !== req.decoded_email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const reviews = await Review.find({ userEmail: email });
    res.send(reviews);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch reviews", error: error.message });
  }
};

const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find();
    res.send(reviews);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch reviews", error: error.message });
  }
};

const createReview = async (req, res) => {
  try {
    const review = req.body;
    const email = req.decoded_email;
    if (review.userEmail !== email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const doc = await Review.create(review);
    res.send({ acknowledged: true, insertedId: doc._id });
  } catch (error) {
    res.status(500).send({ message: "Failed to create review", error: error.message });
  }
};

const updateReview = async (req, res) => {
  try {
    const id = req.params.id;
    const { ratingPoint, reviewComment } = req.body;
    const email = req.decoded_email;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid review ID" });
    }
    const review = await Review.findById(id);
    if (!review) return res.status(404).send({ message: "Review not found" });
    if (review.userEmail !== email) return res.status(403).send({ message: "Forbidden Access" });
    const result = await Review.updateOne({ _id: id }, { $set: { ratingPoint, reviewComment, reviewDate: new Date() } });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update review", error: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const id = req.params.id;
    const email = req.decoded_email;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid review ID" });
    }
    const review = await Review.findById(id);
    if (!review) return res.status(404).send({ message: "Review not found" });
    const user = await User.findOne({ email });
    const isModerator = user?.role === "moderator" || user?.role === "admin";
    const isOwner = review.userEmail === email;
    if (!isOwner && !isModerator) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const result = await Review.deleteOne({ _id: id });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete review", error: error.message });
  }
};

module.exports = { getPublicReviews, getScholarshipReviews, getUserReviews, getAllReviews, createReview, updateReview, deleteReview };
