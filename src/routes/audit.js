const express = require("express");
const db = require("../db/db");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

router.get("/", requireRole("admin"), (_req, res) => {
  const logs = db
    .prepare(
      "SELECT al.id, al.action, al.resource, al.resource_id, " +
      "u.name as user_name, u.email as user_email, " +
      "r.date as record_date " +
      "FROM audit_logs al " +
      "LEFT JOIN users u ON u.id = al.user_id " +
      "LEFT JOIN records r ON r.id = al.resource_id " +
      "ORDER BY al.id DESC LIMIT 100"
    )
    .all();

  res.json(logs);
});

module.exports = router;
