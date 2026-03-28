const User = require("../models/User");
const Scholarship = require("../models/Scholarship");
const Application = require("../models/Application");

const getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalScholarships = await Scholarship.countDocuments();
    const totalApplications = await Application.countDocuments();
    const acceptedApplications = await Application.countDocuments({ applicationStatus: "accepted" });

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

    res.send({
      totalUsers,
      totalScholarships,
      totalFeesCollected,
      totalApplications,
      acceptedApplications,
      applicationsByUniversity,
      applicationsByCategory,
    });
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch analytics", error: error.message });
  }
};

const getAnalyticsTrends = async (req, res) => {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const monthlyApplications = await Application.aggregate([
      { $match: { appliedAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$appliedAt" }, month: { $month: "$appliedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: [
                  { $lt: ["$_id.month", 10] },
                  { $concat: ["0", { $toString: "$_id.month" }] },
                  { $toString: "$_id.month" },
                ],
              },
            ],
          },
          count: 1,
        },
      },
    ]);

    res.send({ monthlyApplications });
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch trends", error: error.message });
  }
};

module.exports = { getAnalytics, getAnalyticsTrends };
