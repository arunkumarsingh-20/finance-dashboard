const db = require("../db/db");
const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/errors");

function mockOrJwtAuth(req, _res, next) {
  const authHeader = req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const payload = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.id);
      if (!user) return next(new AppError("Invalid user", 401));
      if (user.status !== "active") return next(new AppError("User is inactive", 403));
      req.user = user;
      return next();
    } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new AppError("Token expired", 401));
    }
    return next(new AppError("Invalid token", 401));
    }
  }

  // fallback to x-user-id (mock)
  const userId = req.header("x-user-id");
  if (!userId) return next(new AppError("Missing Authorization or x-user-id", 401));

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return next(new AppError("Invalid user", 401));
  if (user.status !== "active") return next(new AppError("User is inactive", 403));

  req.user = user;
  next();
}

module.exports = { mockAuth: mockOrJwtAuth };
