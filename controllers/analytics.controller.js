const { getCollections } = require("../config/db");

const getAnalytics = async (req, res) => {
  try {
    const { userCollection, scholarshipCollection, applicationCollection } = getCollections();

    const totalUsers = await userCollection.countDocuments();
    const totalScholarships = await scholarshipCollection.countDocuments();

    const feeResult = await applicationCollection
      .aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ])
      .toArray();
    const totalFeesCollected = feeResult[0]?.total || 0;

    const applicationsByUniversity = await applicationCollection
      .aggregate([
        { $group: { _id: "$universityName", count: { $sum: 1 } } },
        { $project: { _id: 0, name: "$_id", count: 1 } },
      ])
      .toArray();

    const applicationsByCategory = await applicationCollection
      .aggregate([
        { $group: { _id: "$scholarshipCategory", count: { $sum: 1 } } },
        { $project: { _id: 0, name: "$_id", count: 1 } },
      ])
      .toArray();

    res.send({ totalUsers, totalScholarships, totalFeesCollected, applicationsByUniversity, applicationsByCategory });
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch analytics", error: error.message });
  }
};

module.exports = { getAnalytics };
