const router = require("express").Router();
const { verifyFirebaseToken, verifyModerator } = require("../middleware/auth");
const c = require("../controllers/reviews.controller");

router.get("/reviews/public", c.getPublicReviews);
router.get("/reviews/scholarship/:scholarshipId", c.getScholarshipReviews);
router.get("/reviews/user/:email", verifyFirebaseToken, c.getUserReviews);
router.get("/reviews", verifyFirebaseToken, verifyModerator, c.getAllReviews);
router.post("/reviews", verifyFirebaseToken, c.createReview);
router.patch("/reviews/:id", verifyFirebaseToken, c.updateReview);
router.delete("/reviews/:id", verifyFirebaseToken, c.deleteReview);

module.exports = router;
