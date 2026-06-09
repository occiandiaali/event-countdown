const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  details: { type: String },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  slug: { type: String, required: true, unique: true },
  allowBooking: { type: Boolean, default: false }, // New Toggle Field
  theme: {
    type: { type: String, enum: ["preset", "custom"], default: "preset" },
    value: { type: String, default: "theme-dark" },
    bg: { type: String },
    text: { type: String },
    bgImage: { type: String }, // New Background Image Field
  },
  attendees: [
    {
      name: String,
      email: String,
      bookedAt: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model("Event", EventSchema);
