const express = require("express");
const db = require("../db/db");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

router.get("/", requireRole("analyst", "admin"), async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Query q is required" });

    const recordsRes = await db.query(
      "SELECT id, amount, type, category, date, notes FROM records " +
      "WHERE deleted_at IS NULL AND (category ILIKE $1 OR notes ILIKE $2) " +
      "ORDER BY date DESC LIMIT 20",
      [`%${q}%`, `%${q}%`]
    );

    const usersRes = await db.query(
      "SELECT id, name, email, role, status FROM users " +
      "WHERE name ILIKE $1 OR email ILIKE $2 LIMIT 20",
      [`%${q}%`, `%${q}%`]
    );

    res.json({ records: recordsRes.rows, users: usersRes.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
