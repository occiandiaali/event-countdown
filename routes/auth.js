const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Register Endpoint
router.post("/register", async (req, res) => {
  try {
    const { email, password, tier } = req.body;
    let user = await User.findOne({ email });
    if (user)
      return res
        .status(400)
        .send('<p style="color:red">User already exists</p>');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await User.create({
      email,
      password: hashedPassword,
      tier: tier || "basic",
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, tier: user.tier },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    res.setHeader("HX-Redirect", "/");
    res.end();
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Login Endpoint
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .send('<p style="color:red">Invalid Credentials</p>');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(400)
        .send('<p style="color:red">Invalid Credentials</p>');

    const token = jwt.sign(
      { id: user._id, email: user.email, tier: user.tier },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    res.setHeader("HX-Redirect", "/");
    res.end();
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Logout Endpoint
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.setHeader("HX-Redirect", "/");
  res.end();
});

module.exports = router;
