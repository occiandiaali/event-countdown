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
      clientOffset, // Grab the hidden offset minutes from the body
    } = req.body;
    const slug =
      title.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
      "-" +
      Date.now().toString().slice(-4);

    // Only allow booking selection and image styling if user tier is premium
    const isPremium = req.user.tier === "premium";
    const bookingEnabled = isPremium && allowBooking === "true";

    // Helper function to convert dynamic browser strings into exact absolute UTC dates
    const parseClientDate = (dateString, offsetMinutes) => {
      if (!dateString) return null;
      const localDate = new Date(dateString); // Server parses as local/UTC incorrectly first
      if (isNaN(localDate.getTime())) return null;

      // If clientOffset exists, subtract it (in ms) to find true absolute UTC time
      if (offsetMinutes !== undefined) {
        const offsetMs = parseInt(offsetMinutes, 10) * 60 * 1000;
        return new Date(localDate.getTime() + offsetMs);
      }
      return localDate;
    };

    const targetStart = parseClientDate(startAt, clientOffset);
    const targetEnd = parseClientDate(endAt, clientOffset);

    if (!targetStart || !targetEnd) {
      return res
        .status(400)
        .send(
          '<p style="color:red">Invalid date configuration entries provided.</p>',
        );
    }

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
      startAt: targetStart, //new Date(startAt),
      endAt: targetEnd, //new Date(endAt),
      slug,
      allowBooking: bookingEnabled,
      theme: themeConfig,
    });

    const fullUrl = `${req.protocol}://${req.get("host")}/e/${newEvent.slug}`;
    const embedCode = `<iframe src="${fullUrl}" width="100%" height="300" style="border:none; border-radius:8px;"></iframe>`;

    res.send(`
      <div class="success-box">
          <p>🎉 <strong>Event Configured Natively in Your Timezone!</strong></p>
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

// DELETE /events/clear-all - Delete all events
router.delete("/clear-all", requireAuth, async (req, res) => {
  try {
    await Event.deleteMany({ userId: req.user.id });

    // Returning the container explicitly as the outer shell wrapper
    res.send(`
      <div class="container" id="dashboard-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; width: 100%;">
              <h2>Your Dashboard Events</h2>
              <a href="/" class="cta-btn" style="text-decoration: none; padding: 8px 16px; font-size: 0.9rem;">+ Create New</a>
          </div>
          <div style="background: var(--bg-surface); padding: 40px; text-align: center; border-radius: 8px; width: 100%;">
              <p style="color: #a1a1aa;">All instances dropped successfully.</p>
              <a href="/" style="color: var(--accent);">Create your first countdown timer &rarr;</a>
          </div>
      </div>
    `);
  } catch (err) {
    res.status(500).send("Error clearing events data records.");
  }
});

// DELETE /events/:id - Delete an individual event
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!event) return res.status(404).send("Event not found");

    // Returning an empty response string tells HTMX to remove the target element from the DOM
    res.send("");
  } catch (err) {
    res.status(500).send("Error deleting event.");
  }
});

module.exports = router;
