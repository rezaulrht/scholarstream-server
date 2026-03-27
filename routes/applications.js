const router = require("express").Router();
const { verifyFirebaseToken, verifyAdmin, verifyModerator } = require("../middleware/auth");
const c = require("../controllers/applications.controller");

router.post("/applications", verifyFirebaseToken, c.createApplication);
router.get("/applications", verifyFirebaseToken, verifyAdmin, c.getAllApplications);
router.get("/applications/user/:email", verifyFirebaseToken, c.getUserApplications);
// MUST be before /:id — otherwise "moderator" matches as an id param
router.get("/applications/moderator", verifyFirebaseToken, verifyModerator, c.getModeratorApplications);
router.get("/applications/:id", verifyFirebaseToken, c.getApplicationById);
router.patch("/applications/:id/feedback", verifyFirebaseToken, verifyModerator, c.updateApplicationFeedback);
router.patch("/applications/:id/status", verifyFirebaseToken, verifyModerator, c.updateApplicationStatus);
router.patch("/applications/:id", verifyFirebaseToken, c.updateApplication);
router.delete("/applications/:id", verifyFirebaseToken, c.deleteApplication);

module.exports = router;
