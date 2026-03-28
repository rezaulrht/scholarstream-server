const mongoose = require("mongoose");
const User = require("../models/User");

const createUser = async (req, res) => {
  try {
    const user = req.body;
    const existingUser = await User.findOne({ email: user.email });
    if (existingUser) {
      return res.send({ message: "user already exists", insertedId: null });
    }
    const doc = await User.create({ ...user, role: "student", createdAt: new Date() });
    res.send({ acknowledged: true, insertedId: doc._id });
  } catch (error) {
    res.status(500).send({ message: "Failed to store user", error: error.message });
  }
};

const getUserRole = async (req, res) => {
  try {
    const email = req.params.email;
    if (email !== req.decoded_email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const user = await User.findOne({ email });
    res.send({ role: user?.role || "student" });
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch role", error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role && role !== "all") query.role = role;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await User.countDocuments(query);
    const users = await User.find(query).skip(skip).limit(limitNum);

    res.send({ users, totalCount, currentPage: pageNum, totalPages: Math.ceil(totalCount / limitNum) });
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch users", error: error.message });
  }
};

const getUserByEmail = async (req, res) => {
  try {
    const email = req.params.email;
    if (email !== req.decoded_email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    res.send(user);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch user", error: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const email = req.params.email;
    if (email !== req.decoded_email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const { displayName, photoURL } = req.body;
    const result = await User.updateOne({ email }, { $set: { displayName, photoURL } });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update user", error: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const id = req.params.id;
    const { role } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid user ID" });
    }
    if (!["student", "moderator", "admin"].includes(role)) {
      return res.status(400).send({ message: "Invalid role" });
    }
    const result = await User.updateOne({ _id: id }, { $set: { role } });
    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "User not found" });
    }
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update user role", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid user ID" });
    }
    const result = await User.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "User not found" });
    }
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete user", error: error.message });
  }
};

module.exports = { createUser, getUserRole, getAllUsers, getUserByEmail, updateUserProfile, updateUserRole, deleteUser };
