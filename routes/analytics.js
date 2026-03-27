const router = require("express").Router();
const { verifyFirebaseToken, verifyAdmin } = require("../middleware/auth");
const c = require("../controllers/analytics.controller");

router.get("/analytics", verifyFirebaseToken, verifyAdmin, c.getAnalytics);

module.exports = router;
