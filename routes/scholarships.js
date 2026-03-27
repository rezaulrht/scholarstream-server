// routes/scholarships.js
const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { getCollections } = require("../config/db");
const { verifyFirebaseToken, verifyAdmin } = require("../middleware/auth");

router.get("/scholarships", async (req, res) => {
  try {
    const { scholarshipCollection } = getCollections();
    const { search, country, category, sortBy, sortOrder, page = 1, limit = 10 } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { scholarshipName: { $regex: search, $options: "i" } },
        { universityName: { $regex: search, $options: "i" } },
        { degree: { $regex: search, $options: "i" } },
      ];
    }
    if (country) query.universityCountry = country;
    if (category) query.scholarshipCategory = category;

    let sort = {};
    if (sortBy === "fees") {
      sort.applicationFees = sortOrder === "desc" ? -1 : 1;
    } else if (sortBy === "deadline") {
      sort.applicationDeadline = sortOrder === "desc" ? -1 : 1;
    } else {
      sort.postedDate = -1;
    }

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await scholarshipCollection.countDocuments(query);
    const scholarships = await scholarshipCollection
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .toArray();

    res.send({ scholarships, totalCount, currentPage: pageNum, totalPages: Math.ceil(totalCount / limitNum) });
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch scholarships", error: error.message });
  }
});

router.get("/scholarships/:id/recommendations", async (req, res) => {
  try {
    const { scholarshipCollection } = getCollections();
    const id = req.params.id;
    const limit = parseInt(req.query.limit) || 6;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid scholarship ID" });
    }
    const current = await scholarshipCollection.findOne({ _id: new ObjectId(id) });
    if (!current) {
      return res.status(404).send({ message: "Scholarship not found" });
    }
    const recommendations = await scholarshipCollection
      .find({ scholarshipCategory: current.scholarshipCategory, _id: { $ne: new ObjectId(id) } })
      .limit(limit)
      .toArray();
    res.send(recommendations);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch recommendations", error: error.message });
  }
});

router.get("/scholarships/:id", async (req, res) => {
  try {
    const { scholarshipCollection } = getCollections();
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid scholarship ID" });
    }
    const scholarship = await scholarshipCollection.findOne({ _id: new ObjectId(id) });
    res.send(scholarship);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch scholarship", error: error.message });
  }
});

router.post("/add-scholarship", verifyFirebaseToken, verifyAdmin, async (req, res) => {
  try {
    const { scholarshipCollection } = getCollections();
    const result = await scholarshipCollection.insertOne(req.body);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to add scholarship", error: error.message });
  }
});

router.patch("/scholarships/:id", verifyFirebaseToken, verifyAdmin, async (req, res) => {
  try {
    const { scholarshipCollection } = getCollections();
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid scholarship ID" });
    }
    const result = await scholarshipCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: req.body }
    );
    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Scholarship not found" });
    }
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update scholarship", error: error.message });
  }
});

router.delete("/scholarships/:id", verifyFirebaseToken, verifyAdmin, async (req, res) => {
  try {
    const { scholarshipCollection } = getCollections();
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid scholarship ID" });
    }
    const result = await scholarshipCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Scholarship not found" });
    }
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete scholarship", error: error.message });
  }
});

module.exports = router;
