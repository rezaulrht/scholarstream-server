const { ObjectId } = require("mongodb");
const { getCollections } = require("../config/db");

const createUser = async (req, res) => {
  try {
    const { userCollection } = getCollections();
    const user = req.body;
    const existingUser = await userCollection.findOne({ email: user.email });
    if (existingUser) {
      return res.send({ message: "user already exists", insertedId: null });
    }
    user.role = "student";
    user.createdAt = new Date();
    const result = await userCollection.insertOne(user);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to store user", error: error.message });
  }
};

const getUserRole = async (req, res) => {
  try {
    const { userCollection } = getCollections();
    const email = req.params.email;
    if (email !== req.decoded_email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const user = await userCollection.findOne({ email });
    res.send({ role: user?.role || "student" });
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch role", error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { userCollection } = getCollections();
    const users = await userCollection.find().toArray();
    res.send(users);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch users", error: error.message });
  }
};

const getUserByEmail = async (req, res) => {
  try {
    const { userCollection } = getCollections();
    const email = req.params.email;
    if (email !== req.decoded_email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const user = await userCollection.findOne({ email });
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
    const { userCollection } = getCollections();
    const email = req.params.email;
    if (email !== req.decoded_email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const { displayName, photoURL } = req.body;
    const result = await userCollection.updateOne(
      { email },
      { $set: { displayName, photoURL } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update user", error: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userCollection } = getCollections();
    const id = req.params.id;
    const { role } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid user ID" });
    }
    if (!["student", "moderator", "admin"].includes(role)) {
      return res.status(400).send({ message: "Invalid role" });
    }
    const result = await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { role } }
    );
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
    const { userCollection } = getCollections();
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid user ID" });
    }
    const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "User not found" });
    }
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete user", error: error.message });
  }
};

module.exports = { createUser, getUserRole, getAllUsers, getUserByEmail, updateUserProfile, updateUserRole, deleteUser };
