const mongoose = require("mongoose");
const Application = require("../models/Application");

const createApplication = async (req, res) => {
  try {
    const application = req.body;
    const email = req.decoded_email;
    if (application.userEmail !== email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const existing = await Application.findOne({
      scholarshipId: application.scholarshipId,
      userEmail: application.userEmail,
    });
    if (existing && existing.applicationStatus !== "rejected") {
      return res.status(400).send({ message: "You have already applied for this scholarship" });
    }
    const doc = await Application.create(application);
    res.send({ acknowledged: true, insertedId: doc._id });
  } catch (error) {
    res.status(500).send({ message: "Failed to create application", error: error.message });
  }
};

const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find();
    res.send(applications);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch applications", error: error.message });
  }
};

const getUserApplications = async (req, res) => {
  try {
    const email = req.params.email;
    if (email !== req.decoded_email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    const applications = await Application.find({ userEmail: email });
    res.send(applications);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch applications", error: error.message });
  }
};

const getModeratorApplications = async (req, res) => {
  try {
    const applications = await Application.find({ paymentStatus: "paid" });
    res.send(applications);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch applications", error: error.message });
  }
};

const getApplicationById = async (req, res) => {
  try {
    const id = req.params.id;
    const email = req.decoded_email;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid application ID format" });
    }
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).send({ message: "Application not found" });
    }
    if (application.userEmail !== email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    res.send(application);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch application", error: error.message });
  }
};

const updateApplicationFeedback = async (req, res) => {
  try {
    const id = req.params.id;
    const { feedback } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid application ID" });
    }
    const result = await Application.updateOne({ _id: id }, { $set: { feedback } });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update feedback", error: error.message });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { applicationStatus } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid application ID" });
    }
    const result = await Application.updateOne({ _id: id }, { $set: { applicationStatus } });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update status", error: error.message });
  }
};

const updateApplication = async (req, res) => {
  try {
    const id = req.params.id;
    const email = req.decoded_email;
    const { phone, dateOfBirth, gender, currentUniversity, cgpa } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid application ID" });
    }
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).send({ message: "Application not found" });
    }
    if (application.userEmail !== email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    if (application.applicationStatus !== "pending" && application.applicationStatus !== "needs revision") {
      return res.status(400).send({ message: "Cannot edit application that is not pending or needs revision" });
    }
    const updateData = { phone, dateOfBirth, gender, currentUniversity, cgpa };
    if (application.applicationStatus === "needs revision") {
      updateData.applicationStatus = "pending";
    }
    const result = await Application.updateOne({ _id: id }, { $set: updateData });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update application", error: error.message });
  }
};

const deleteApplication = async (req, res) => {
  try {
    const id = req.params.id;
    const email = req.decoded_email;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid application ID" });
    }
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).send({ message: "Application not found" });
    }
    if (application.userEmail !== email) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    if (application.applicationStatus !== "pending") {
      return res.status(400).send({ message: "Cannot delete application that is not pending" });
    }
    const result = await Application.deleteOne({ _id: id });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete application", error: error.message });
  }
};

module.exports = { createApplication, getAllApplications, getUserApplications, getModeratorApplications, getApplicationById, updateApplicationFeedback, updateApplicationStatus, updateApplication, deleteApplication };
