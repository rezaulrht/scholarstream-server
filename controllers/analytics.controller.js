const User = require("../models/User");
const Scholarship = require("../models/Scholarship");
const Application = require("../models/Application");

const getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalScholarships = await Scholarship.countDocuments();

    const feeResult = await Application.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalFeesCollected = feeResult[0]?.total || 0;

    const applicationsByUniversity = await Application.aggregate([
      { $group: { _id: "$universityName", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", count: 1 } },
    ]);

    const applicationsByCategory = await Application.aggregate([
      { $group: { _id: "$scholarshipCategory", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", count: 1 } },
    ]);

    res.send({ totalUsers, totalScholarships, totalFeesCollected, applicationsByUniversity, applicationsByCategory });
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch analytics", error: error.message });
  }
};

module.exports = { getAnalytics };
