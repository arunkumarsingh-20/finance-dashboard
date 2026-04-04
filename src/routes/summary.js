const express = require("express");
const db = require("../db/db");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

// Viewer, Analyst, Admin can view summaries
router.get("/", requireRole("viewer", "analyst", "admin"), async (_req, res, next) => {
  try {
    const incomeRes = await db.query(
      "SELECT COALESCE(SUM(amount),0) as total FROM records WHERE type='income' AND deleted_at IS NULL"
    );
    const expenseRes = await db.query(
      "SELECT COALESCE(SUM(amount),0) as total FROM records WHERE type='expense' AND deleted_at IS NULL"
    );

    const totalIncome = Number(incomeRes.rows[0].total);
    const totalExpense = Number(expenseRes.rows[0].total);
    const netBalance = totalIncome - totalExpense;

    const categoryRes = await db.query(
      "SELECT category, SUM(amount) as total FROM records WHERE deleted_at IS NULL GROUP BY category ORDER BY total DESC"
    );

    const recentRes = await db.query(
      "SELECT * FROM records WHERE deleted_at IS NULL ORDER BY date DESC LIMIT 5"
    );

    res.json({
      totalIncome,
      totalExpense,
      netBalance,
      categoryTotals: categoryRes.rows,
      recent: recentRes.rows
    });
  } catch (err) {
    next(err);
  }
});

// Monthly trend
router.get("/monthly", requireRole("viewer", "analyst", "admin"), async (_req, res, next) => {
  try {
    const rows = await db.query(
      "SELECT to_char(date, 'YYYY-MM') as month, " +
      "SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income, " +
      "SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense " +
      "FROM records WHERE deleted_at IS NULL GROUP BY month ORDER BY month"
    );

    res.json(rows.rows);
  } catch (err) {
    next(err);
  }
});

router.get("/weekly", requireRole("viewer", "analyst", "admin"), async (_req, res, next) => {
  try {
    const rows = await db.query(
      "SELECT to_char(date, 'IYYY-IW') as week, " +
      "SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income, " +
      "SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense " +
      "FROM records WHERE deleted_at IS NULL GROUP BY week ORDER BY week"
    );

    res.json(rows.rows);
  } catch (err) {
    next(err);
  }
});

router.get("/type", requireRole("viewer", "analyst", "admin"), async (_req, res, next) => {
  try {
    const rows = await db.query(
      "SELECT type, SUM(amount) as total " +
      "FROM records WHERE deleted_at IS NULL GROUP BY type"
    );

    res.json(rows.rows);
  } catch (err) {
    next(err);
  }
});

router.get("/category", requireRole("viewer", "analyst", "admin"), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let where = "deleted_at IS NULL";
    const params = [];
    let i = 1;

    if (startDate) {
      where += ` AND date >= $${i++}`;
      params.push(startDate);
    }
    if (endDate) {
      where += ` AND date <= $${i++}`;
      params.push(endDate);
    }
    const rows = await db.query(
      `SELECT category, 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM records
      WHERE ${where}
      GROUP BY category
      ORDER BY (
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) +
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END)
      ) DESC`,
      params
    );


    res.json(rows.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
