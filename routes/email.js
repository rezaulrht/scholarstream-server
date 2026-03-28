const router = require("express").Router();
const c = require("../controllers/email.controller");

router.post("/forgot-password", c.forgotPassword);

module.exports = router;
