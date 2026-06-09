const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const { requireAuth } = require("../middleware/auth");

// GET /events - List past events created by the logged-in user
router.get("/", requireAuth, async (req, res) => {
  try {
    const events = await Event.find({ userId: req.user.id }).sort({
      startAt: -1,
    });
    res.render("events-list", { user: req.user, events });
  } catch (err) {
    res.status(500).send("Error retrieving events.");
  }
});

// POST /events/create - Process new events
router.post("/create", requireAuth, async (req, res) => {
  try {
    const {
      title,
      details,
      startAt,
      endAt,
      themePreset,
      customBg,
      customText,
      customBgImage,
      allowBooking,
    } = req.body;
    const slug =
      title.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
      "-" +
      Date.now().toString().slice(-4);

    // Only allow booking selection and image styling if user tier is premium
    const isPremium = req.user.tier === "premium";
    const bookingEnabled = isPremium && allowBooking === "true";

    const themeConfig = {
      type: isPremium && (customBg || customBgImage) ? "custom" : "preset",
      value: themePreset,
      bg: isPremium ? customBg : undefined,
      text: isPremium ? customText : undefined,
      bgImage: isPremium ? customBgImage : undefined,
    };

    const newEvent = await Event.create({
      userId: req.user.id,
      title,
      details,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      slug,
      allowBooking: bookingEnabled,
      theme: themeConfig,
    });

    const fullUrl = `${req.protocol}://${req.get("host")}/e/${newEvent.slug}`;
    const embedCode = `<iframe src="${fullUrl}" width="100%" height="300" style="border:none; border-radius:8px;"></iframe>`;

    res.send(`
      <div class="success-box">
          <p>🎉 <strong>Event Configured!</strong></p>
          <p><strong>Public URL:</strong> <a href="${fullUrl}" target="_blank">${fullUrl}</a></p>
          ${
            isPremium
              ? `
              <div class="embed-box" style="margin-top: 15px;">
                <label><strong>Iframe Embed:</strong></label>
                <textarea readonly onclick="this.select()" style="width:100%; height:60px; font-family:monospace; background:#000; color:#0f0; border:none; padding:5px; border-radius:4px;">${embedCode}</textarea>
              </div>
          `
              : ""
          }
      </div>
    `);
  } catch (err) {
    res.status(500).send('<p style="color:red">Failed to create event.</p>');
  }
});

// POST /events/:slug/book - Handle attendee RSVP
router.post("/:slug/book", async (req, res) => {
  try {
    const { name, email } = req.body;
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event || !event.allowBooking)
      return res.status(400).send("Bookings not allowed for this event.");

    event.attendees.push({ name, email });
    await event.save();

    res.send(
      '<p style="color: #4ade80; font-weight: bold; margin-top: 10px;">✅ Your spot is reserved successfully!</p>',
    );
  } catch (err) {
    res.status(500).send("Error submitting registration.");
  }
});

module.exports = router;
