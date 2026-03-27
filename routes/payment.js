const router = require("express").Router();
const { verifyFirebaseToken } = require("../middleware/auth");
const c = require("../controllers/payment.controller");

router.post("/create-checkout-session", verifyFirebaseToken, c.createCheckoutSession);
router.patch("/payment-success", verifyFirebaseToken, c.handlePaymentSuccess);

module.exports = router;
