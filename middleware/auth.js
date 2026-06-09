const jwt = require("jsonwebtoken");

const parseUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    res.clearCookie("token");
    req.user = null;
  }
  next();
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    if (req.headers["hx-request"]) {
      res.setHeader("HX-Redirect", "/login");
      return res.status(401).end();
    }
    return res.redirect("/login");
  }
  next();
};

module.exports = { parseUser, requireAuth };
