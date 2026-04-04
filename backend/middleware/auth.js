const db = require("../db/db");
const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/errors");
const config = require("../config");

async function mockOrJwtAuth(req, _res, next) {
  try {
    const authHeader = req.header("Authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const payload = jwt.verify(token, config.JWT_SECRET);

      const userRes = await db.query("SELECT * FROM users WHERE id = $1", [payload.id]);
      const user = userRes.rows[0];
      if (!user) return next(new AppError("Invalid user", 401));
      if (user.status !== "active") return next(new AppError("User is inactive", 403));

      req.user = user;
      return next();
    }

    const userId = req.header("x-user-id");
    if (!userId) return next(new AppError("Missing Authorization or x-user-id", 401));

    const userRes = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = userRes.rows[0];
    if (!user) return next(new AppError("Invalid user", 401));
    if (user.status !== "active") return next(new AppError("User is inactive", 403));

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return next(new AppError("Token expired", 401));
    return next(new AppError("Invalid token", 401));
  }
}

module.exports = { mockAuth: mockOrJwtAuth };
