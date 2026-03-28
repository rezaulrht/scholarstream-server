const mongoose = require("mongoose");
const Scholarship = require("../models/Scholarship");

const getScholarships = async (req, res) => {
  try {
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

    const totalCount = await Scholarship.countDocuments(query);
    const scholarships = await Scholarship.find(query).sort(sort).skip(skip).limit(limitNum);

    res.send({ scholarships, totalCount, currentPage: pageNum, totalPages: Math.ceil(totalCount / limitNum) });
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch scholarships", error: error.message });
  }
};

const getScholarshipRecommendations = async (req, res) => {
  try {
    const id = req.params.id;
    const limit = parseInt(req.query.limit) || 6;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid scholarship ID" });
    }
    const current = await Scholarship.findById(id);
    if (!current) {
      return res.status(404).send({ message: "Scholarship not found" });
    }
    const recommendations = await Scholarship.find({
      scholarshipCategory: current.scholarshipCategory,
      _id: { $ne: id },
    }).limit(limit);
    res.send(recommendations);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch recommendations", error: error.message });
  }
};

const getScholarshipById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid scholarship ID" });
    }
    const scholarship = await Scholarship.findById(id);
    res.send(scholarship);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch scholarship", error: error.message });
  }
};

const addScholarship = async (req, res) => {
  try {
    const doc = await Scholarship.create(req.body);
    res.send({ acknowledged: true, insertedId: doc._id });
  } catch (error) {
    res.status(500).send({ message: "Failed to add scholarship", error: error.message });
  }
};

const updateScholarship = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid scholarship ID" });
    }
    const result = await Scholarship.updateOne({ _id: id }, { $set: req.body });
    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Scholarship not found" });
    }
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update scholarship", error: error.message });
  }
};

const deleteScholarship = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid scholarship ID" });
    }
    const result = await Scholarship.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Scholarship not found" });
    }
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete scholarship", error: error.message });
  }
};

const getCountries = async (req, res) => {
  try {
    const countries = await Scholarship.distinct("universityCountry");
    res.send(countries.filter(Boolean).sort());
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch countries", error: error.message });
  }
};

module.exports = { getScholarships, getCountries, getScholarshipRecommendations, getScholarshipById, addScholarship, updateScholarship, deleteScholarship };
