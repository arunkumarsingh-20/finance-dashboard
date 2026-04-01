const express = require("express");
const db = require("../db/db");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

router.get("/", requireRole("analyst", "admin"), (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Query q is required" });

  const records = db
    .prepare(
      "SELECT id, amount, type, category, date, notes FROM records " +
      "WHERE deleted_at IS NULL AND (category LIKE ? OR notes LIKE ?) " +
      "ORDER BY date DESC LIMIT 20"
    )
    .all(`%${q}%`, `%${q}%`);

  const users = db
    .prepare(
      "SELECT id, name, email, role, status FROM users " +
      "WHERE name LIKE ? OR email LIKE ? LIMIT 20"
    )
    .all(`%${q}%`, `%${q}%`);

  res.json({ records, users });
});

module.exports = router;
