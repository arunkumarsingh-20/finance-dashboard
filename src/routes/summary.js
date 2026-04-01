const express = require("express");
const db = require("../db/db");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

// Viewer, Analyst, Admin can view summaries
router.get("/", requireRole("viewer", "analyst", "admin"), (_req, res) => {
  const totalIncome = db
    .prepare("SELECT COALESCE(SUM(amount),0) as total FROM records WHERE type='income' AND deleted_at IS NULL")
    .get().total;

  const totalExpense = db
    .prepare("SELECT COALESCE(SUM(amount),0) as total FROM records WHERE type='expense' AND deleted_at IS NULL")
    .get().total;

  const netBalance = totalIncome - totalExpense;

  const categoryTotals = db
    .prepare(
      "SELECT category, SUM(amount) as total FROM records WHERE deleted_at IS NULL GROUP BY category ORDER BY total DESC"
    )
    .all();

  const recent = db
    .prepare("SELECT * FROM records WHERE deleted_at IS NULL ORDER BY date DESC LIMIT 5")
    .all();

  res.json({
    totalIncome,
    totalExpense,
    netBalance,
    categoryTotals,
    recent
  });
});

// Monthly trend
router.get("/monthly", requireRole("viewer", "analyst", "admin"), (_req, res) => {
  const rows = db
    .prepare(
      "SELECT substr(date,1,7) as month, " +
      "SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income, " +
      "SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense " +
      "FROM records WHERE deleted_at IS NULL GROUP BY month ORDER BY month"
    )
    .all();

  res.json(rows);
});

router.get("/weekly", requireRole("viewer", "analyst", "admin"), (_req, res) => {
  const rows = db
    .prepare(
      "SELECT strftime('%Y-%W', date) as week, " +
      "SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income, " +
      "SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense " +
      "FROM records WHERE deleted_at IS NULL GROUP BY week ORDER BY week"
    )
    .all();

  res.json(rows);
});

router.get("/type", requireRole("viewer", "analyst", "admin"), (_req, res) => {
  const rows = db
    .prepare(
      "SELECT type, SUM(amount) as total " +
      "FROM records WHERE deleted_at IS NULL GROUP BY type"
    )
    .all();

  res.json(rows);
});


router.get("/category", requireRole("viewer", "analyst", "admin"), (req, res) => {
  const { startDate, endDate } = req.query;

  let where = "deleted_at IS NULL";
  const params = [];

  if (startDate) {
    where += " AND date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    where += " AND date <= ?";
    params.push(endDate);
  }

  const rows = db
    .prepare(
      `SELECT category, 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
       FROM records
       WHERE ${where}
       GROUP BY category
       ORDER BY (income + expense) DESC`
    )
    .all(...params);

  res.json(rows);
});



module.exports = router;
