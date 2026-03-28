const router = require("express").Router();
const c = require("../controllers/newsletter.controller");

router.post("/newsletter/subscribe", c.subscribe);

module.exports = router;
