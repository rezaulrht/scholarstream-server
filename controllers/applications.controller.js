const mongoose = require("mongoose");
const Application = require("../models/Application");
const mailer = require("../config/mailer");
const {
  applicationSubmittedTemplate,
  applicationAcceptedTemplate,
  applicationRejectedTemplate,
  applicationRevisionTemplate,
} = require("../utils/emailTemplates");

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
    const { subject, html } = applicationSubmittedTemplate({
      userName: doc.userName,
      scholarshipName: doc.scholarshipName,
      universityName: doc.universityName,
    });
    mailer.sendMail({
      from: `"ScholarStream" <${process.env.EMAIL_USER}>`,
      to: doc.userEmail,
      subject,
      html,
    }).catch((err) => console.error("Submission email failed:", err));
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
    const { page = 1, limit = 20, status } = req.query;
    const query = { paymentStatus: "paid" };
    if (status && status !== "all") query.applicationStatus = status;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Application.countDocuments(query);
    const applications = await Application.find(query).sort({ appliedDate: -1 }).skip(skip).limit(limitNum);

    res.send({ applications, totalCount, currentPage: pageNum, totalPages: Math.ceil(totalCount / limitNum) });
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

const reviewApplication = async (req, res) => {
  try {
    const id = req.params.id;
    const { feedback, applicationStatus } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid application ID" });
    }

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).send({ message: "Application not found" });
    }

    const update = { applicationStatus };
    if (feedback !== undefined) update.feedback = feedback;
    const result = await Application.updateOne({ _id: id }, { $set: update });

    // Fire-and-forget email based on new status
    const templateData = {
      userName: application.userName,
      scholarshipName: application.scholarshipName,
      universityName: application.universityName,
      feedback,
    };
    let emailTemplate;
    if (applicationStatus === "accepted") emailTemplate = applicationAcceptedTemplate(templateData);
    else if (applicationStatus === "rejected") emailTemplate = applicationRejectedTemplate(templateData);
    else if (applicationStatus === "needs revision") emailTemplate = applicationRevisionTemplate(templateData);

    if (emailTemplate) {
      mailer.sendMail({
        from: `"ScholarStream" <${process.env.EMAIL_USER}>`,
        to: application.userEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      }).catch((err) => console.error("Status email failed:", err));
    }

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to review application", error: error.message });
  }
};

module.exports = { createApplication, getAllApplications, getUserApplications, getModeratorApplications, getApplicationById, reviewApplication, updateApplicationFeedback, updateApplicationStatus, updateApplication, deleteApplication };
