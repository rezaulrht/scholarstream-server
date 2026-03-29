require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./config/db");

const app = express();
app.use(express.json());

const normalizeOrigin = (value = "") => value.trim().replace(/\/$/, "");
const allowedOrigins = (process.env.SITE_DOMAIN || "")
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no Origin header (curl/postman/server-to-server).
    if (!origin) return callback(null, true);

    const normalizedRequestOrigin = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalizedRequestOrigin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
}));

// General rate limit: 100 requests per minute per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
}));

// Stricter limit for payment endpoint
app.use("/create-checkout-session", rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "Too many payment requests, please try again later." },
}));

app.use("/", require("./routes/users"));
app.use("/", require("./routes/scholarships"));
app.use("/", require("./routes/applications"));
app.use("/", require("./routes/reviews"));
app.use("/", require("./routes/payment"));
app.use("/", require("./routes/analytics"));
app.use("/", require("./routes/newsletter"));
app.use("/", require("./routes/email"));
app.use("/", require("./routes/upload"));

app.get("/", (req, res) => res.send("ScholarStream Server is Running"));

connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () =>
    console.log(`Server running on port ${process.env.PORT || 5000}`)
  );
});

module.exports = app;
