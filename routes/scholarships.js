const router = require("express").Router();
const { verifyFirebaseToken, verifyAdmin } = require("../middleware/auth");
const c = require("../controllers/scholarships.controller");

router.get("/scholarships", c.getScholarships);
router.get("/scholarships/:id/recommendations", c.getScholarshipRecommendations);
router.get("/scholarships/:id", c.getScholarshipById);
router.post("/add-scholarship", verifyFirebaseToken, verifyAdmin, c.addScholarship);
router.patch("/scholarships/:id", verifyFirebaseToken, verifyAdmin, c.updateScholarship);
router.delete("/scholarships/:id", verifyFirebaseToken, verifyAdmin, c.deleteScholarship);

module.exports = router;
