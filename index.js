require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./config/db");

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.SITE_DOMAIN }));

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

app.get("/", (req, res) => res.send("ScholarStream Server is Running"));

connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () =>
    console.log(`Server running on port ${process.env.PORT || 5000}`)
  );
});

module.exports = app;
