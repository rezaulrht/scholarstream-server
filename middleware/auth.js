// middleware/auth.js
const admin = require("firebase-admin");
const User = require("../models/User");

if (!process.env.FB_SERVICE_KEY) {
  throw new Error("FB_SERVICE_KEY environment variable is not set");
}

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString("utf8");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(decoded)),
  });
}

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(parts[1]);
    req.decoded_email = decodedToken.email;
    next();
  } catch {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
};

const verifyAdmin = async (req, res, next) => {
  const email = req.decoded_email;
  if (!email) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const user = await User.findOne({ email });
  if (user?.role !== "admin") {
    return res.status(403).send({ message: "Forbidden Access" });
  }
  next();
};

const verifyModerator = async (req, res, next) => {
  const email = req.decoded_email;
  if (!email) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const user = await User.findOne({ email });
  if (user?.role !== "moderator" && user?.role !== "admin") {
    return res.status(403).send({ message: "Forbidden Access" });
  }
  next();
};

module.exports = { verifyFirebaseToken, verifyAdmin, verifyModerator };
