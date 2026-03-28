const PRIMARY = "#97a87a";
const DARK = "#3f4430";

const baseLayout = (content) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:${PRIMARY};padding:28px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">ScholarStream</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Your Gateway to Global Scholarships</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eeeeee;">
          <p style="margin:0;color:#999999;font-size:12px;text-align:center;">
            © ${new Date().getFullYear()} ScholarStream. This is an automated email, please do not reply.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const h2 = (text) => `<h2 style="margin:0 0 16px;color:${DARK};font-size:20px;">${text}</h2>`;
const p = (text) => `<p style="margin:0 0 14px;color:#555555;font-size:15px;line-height:1.6;">${text}</p>`;
const badge = (text, color) => `<span style="display:inline-block;padding:6px 16px;background:${color}20;color:${color};border-radius:20px;font-size:13px;font-weight:600;border:1px solid ${color}40;">${text}</span>`;
const feedbackBox = (text) => `
  <div style="margin:20px 0;padding:16px 20px;background:#f9f9f9;border-left:4px solid ${PRIMARY};border-radius:4px;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#999999;text-transform:uppercase;letter-spacing:0.5px;">Moderator Feedback</p>
    <p style="margin:0;color:#444444;font-size:14px;line-height:1.6;">${text}</p>
  </div>`;

const applicationSubmittedTemplate = ({ userName, scholarshipName, universityName }) => ({
  subject: `Application Received — ${scholarshipName}`,
  html: baseLayout(`
    ${h2("Application Received!")}
    ${p(`Hi <strong>${userName}</strong>,`)}
    ${p(`We've successfully received your application for <strong>${scholarshipName}</strong> at <strong>${universityName}</strong>.`)}
    ${p("Our team will review your application and notify you of any updates. This process may take a few weeks.")}
    ${p("In the meantime, you can track your application status from your dashboard.")}
    <div style="margin-top:8px;">${badge("Application Submitted", PRIMARY)}</div>
  `),
});

const applicationAcceptedTemplate = ({ userName, scholarshipName, universityName, feedback }) => ({
  subject: `Congratulations! Your application has been accepted — ${scholarshipName}`,
  html: baseLayout(`
    ${h2("Congratulations! 🎉")}
    ${p(`Hi <strong>${userName}</strong>,`)}
    ${p(`We are thrilled to inform you that your application for <strong>${scholarshipName}</strong> at <strong>${universityName}</strong> has been <strong>accepted</strong>.`)}
    ${feedback ? feedbackBox(feedback) : ""}
    ${p("Please log in to your dashboard for further instructions and next steps.")}
    <div style="margin-top:8px;">${badge("Accepted", "#22c55e")}</div>
  `),
});

const applicationRejectedTemplate = ({ userName, scholarshipName, universityName, feedback }) => ({
  subject: `Application Update — ${scholarshipName}`,
  html: baseLayout(`
    ${h2("Application Status Update")}
    ${p(`Hi <strong>${userName}</strong>,`)}
    ${p(`After careful review, we regret to inform you that your application for <strong>${scholarshipName}</strong> at <strong>${universityName}</strong> has not been successful at this time.`)}
    ${feedback ? feedbackBox(feedback) : ""}
    ${p("We encourage you to explore other scholarship opportunities available on ScholarStream.")}
    <div style="margin-top:8px;">${badge("Not Accepted", "#ef4444")}</div>
  `),
});

const applicationRevisionTemplate = ({ userName, scholarshipName, universityName, feedback }) => ({
  subject: `Action Required: Revision needed — ${scholarshipName}`,
  html: baseLayout(`
    ${h2("Revision Required")}
    ${p(`Hi <strong>${userName}</strong>,`)}
    ${p(`Your application for <strong>${scholarshipName}</strong> at <strong>${universityName}</strong> requires some revisions before it can be processed further.`)}
    ${feedback ? feedbackBox(feedback) : ""}
    ${p("Please log in to your dashboard, update your application based on the feedback above, and resubmit.")}
    <div style="margin-top:8px;">${badge("Needs Revision", "#f97316")}</div>
  `),
});

const passwordResetTemplate = ({ userName, resetLink }) => ({
  subject: "Reset your ScholarStream password",
  html: baseLayout(`
    ${h2("Password Reset Request")}
    ${p(`Hi <strong>${userName || "there"}</strong>,`)}
    ${p("We received a request to reset the password for your ScholarStream account. Click the button below to set a new password:")}
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetLink}" style="display:inline-block;padding:14px 32px;background:${PRIMARY};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none;">Reset Password</a>
    </div>
    ${p("This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.")}
    ${p(`Or copy this link into your browser: <span style="color:${PRIMARY};word-break:break-all;">${resetLink}</span>`)}
  `),
});

module.exports = {
  applicationSubmittedTemplate,
  applicationAcceptedTemplate,
  applicationRejectedTemplate,
  applicationRevisionTemplate,
  passwordResetTemplate,
};
