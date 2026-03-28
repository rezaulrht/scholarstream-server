const admin = require("../middleware/auth").admin;
const mailer = require("../config/mailer");
const { passwordResetTemplate } = require("../utils/emailTemplates");

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).send({ message: "Valid email is required" });
  }

  try {
    let resetLink;
    let userName = "";

    try {
      resetLink = await admin.auth().generatePasswordResetLink(email);
      const userRecord = await admin.auth().getUserByEmail(email);
      userName = userRecord.displayName || "";
    } catch {
      // User not found or other Firebase error — return 200 to prevent user enumeration
      return res.send({ message: "If an account exists, a reset link has been sent" });
    }

    const { subject, html } = passwordResetTemplate({ userName, resetLink });
    await mailer.sendMail({ from: `"ScholarStream" <${process.env.EMAIL_USER}>`, to: email, subject, html });

    res.send({ message: "If an account exists, a reset link has been sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).send({ message: "Failed to send reset email" });
  }
};

module.exports = { forgotPassword };
