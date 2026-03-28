const Subscriber = require("../models/Subscriber");

const subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).send({ message: "Valid email is required" });
    }

    const existing = await Subscriber.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).send({ message: "Already subscribed" });
    }

    await Subscriber.create({ email });
    res.send({ message: "Successfully subscribed" });
  } catch (error) {
    res.status(500).send({ message: "Failed to subscribe", error: error.message });
  }
};

module.exports = { subscribe };
