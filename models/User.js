const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String, required: true },
  tier: { type: String, enum: ["basic", "premium"], default: "basic" },
});

module.exports = mongoose.model("User", UserSchema);
