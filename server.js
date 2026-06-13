const express = require("express");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { parseUser } = require("./middleware/auth");
const Event = require("./models/Event");
require("dotenv").config();

const app = express();

// Database Access Routing
connectDB();

// Layout and Parser Configurations
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

// Global Middlewares
app.use(parseUser);

// Explicit Page Router Handlers
app.get("/", async (req, res) => {
  res.render("index", { user: req.user });
});

app.get("/login", (req, res) => {
  if (req.user) return res.redirect("/");
  res.render("login", { user: null });
});

app.get("/register", (req, res) => {
  if (req.user) return res.redirect("/");
  res.render("register", { user: null });
});

// Deep Public Slug Routing Engine Configuration
app.get("/e/:slug", async (req, res) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug }).populate(
      "userId",
    );
    if (!event)
      return res.status(404).send("The event link provided does not exist.");

    const now = new Date();
    let state = "active";

    if (now < event.startAt) {
      state = "scheduled";
    } else if (now > event.endAt) {
      state = "expired";
    }

    res.render("countdown", { event, state, user: req.user });
  } catch (err) {
    res.status(500).send("Error rendering countdown space.");
  }
});

// Route Modules Split Execution
app.use("/auth", require("./routes/auth"));
app.use("/events", require("./routes/events"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Application actively streaming on http://localhost:${PORT}`),
);
