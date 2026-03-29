const mongoose = require("mongoose");
const Application = require("../models/Application");
const stripe = require("../config/stripe");

const createCheckoutSession = async (req, res) => {
  try {
    const siteDomain = (process.env.SITE_DOMAIN || "").replace(/\/$/, "");
    const paymentInfo = req.body;
    const amount = Math.round(parseFloat(paymentInfo.totalAmount) * 100);

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
              name: paymentInfo.scholarshipName,
              description: `Application for ${paymentInfo.universityName}`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: paymentInfo.userEmail,
      mode: "payment",
      metadata: {
        applicationId: paymentInfo.applicationId,
        scholarshipId: paymentInfo.scholarshipId,
        userEmail: paymentInfo.userEmail,
      },
      success_url: `${siteDomain}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteDomain}/dashboard/payment-failed`,
    });

    res.send({ url: session.url });
  } catch (error) {
    res
      .status(500)
      .send({
        message: "Failed to create payment session",
        error: error.message,
      });
  }
};

const handlePaymentSuccess = async (req, res) => {
  try {
    const session_id = req.query.session_id;
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid") {
      const applicationId = session.metadata.applicationId;
      if (!mongoose.Types.ObjectId.isValid(applicationId)) {
        return res
          .status(400)
          .send({ success: false, message: "Invalid application ID format" });
      }
      await Application.updateOne(
        { _id: applicationId },
        { $set: { paymentStatus: "paid", transactionId: session.id } },
      );
      res.send({ success: true, session });
    } else {
      res
        .status(400)
        .send({ success: false, message: "Payment not completed" });
    }
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

module.exports = { createCheckoutSession, handlePaymentSuccess };
