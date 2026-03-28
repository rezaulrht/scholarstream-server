const router = require("express").Router();
const { verifyFirebaseToken } = require("../middleware/auth");
const c = require("../controllers/upload.controller");

router.post("/upload-url", verifyFirebaseToken, c.getUploadUrls);

module.exports = router;
