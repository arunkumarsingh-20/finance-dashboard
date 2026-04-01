const express = require("express");
const { z } = require("zod");
const db = require("../db/db");
const { validate } = require("../utils/validate");
const { requireRole } = require("../middleware/rbac");
const { audit, auditWriter } = require("../middleware/audit");

const router = express.Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const recordSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Category required"),
  date: z.string().regex(dateRegex, "Date must be YYYY-MM-DD"),
  notes: z.string().optional()
});

const updateRecordSchema = recordSchema.partial();

function parsePagination(query) {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "20", 10), 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// Create record (admin only) + audit
router.post(
  "/",
  requireRole("admin"),
  audit("create", "record"),
  validate(recordSchema),
  (req, res, next) => {
    const { amount, type, category, date, notes } = req.body;
    const stmt = db.prepare(
      "INSERT INTO records (amount, type, category, date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const info = stmt.run(amount, type, category, date, notes || null, req.user.id);
      req._audit.resourceId = info.lastInsertRowid;
      const record = db.prepare("SELECT * FROM records WHERE id = ?").get(info.lastInsertRowid);
      res.status(201).json(record);
      next();
  },
  auditWriter
);

// List records (viewer/analyst/admin)
router.get("/", requireRole("viewer", "analyst", "admin"), (req, res) => {
  const { type, category, startDate, endDate, q } = req.query;
  const { page, limit, offset } = parsePagination(req.query);

  let where = "WHERE deleted_at IS NULL";
  const params = [];

  if (type) {
    where += " AND type = ?";
    params.push(type);
  }
  if (category) {
    where += " AND category = ?";
    params.push(category);
  }
  if (startDate) {
    where += " AND date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    where += " AND date <= ?";
    params.push(endDate);
  }
  if (q) {
    where += " AND (category LIKE ? OR notes LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM records ${where}`).get(...params);

  const records = db
    .prepare(`SELECT * FROM records ${where} ORDER BY date DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  res.json({
    meta: {
      total: countRow.total,
      page,
      limit
    },
    data: records
  });
});

// Export records as CSV (supports filters)
router.get("/export/csv", requireRole("viewer", "analyst", "admin"), (req, res) => {
  const { type, category, startDate, endDate, q } = req.query;

  let where = "WHERE deleted_at IS NULL";
  const params = [];

  if (type) {
    where += " AND type = ?";
    params.push(type);
  }
  if (category) {
    where += " AND category = ?";
    params.push(category);
  }
  if (startDate) {
    where += " AND date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    where += " AND date <= ?";
    params.push(endDate);
  }
  if (q) {
    where += " AND (category LIKE ? OR notes LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  const rows = db
    .prepare(`SELECT * FROM records ${where} ORDER BY date DESC`)
    .all(...params);

  const header = "id,amount,type,category,date,notes,created_by,created_at\n";
  const csv =
    header +
    rows
      .map(r =>
        [
          r.id,
          r.amount,
          r.type,
          r.category,
          r.date,
          (r.notes || "").replace(/"/g, '""'),
          r.created_by,
          r.created_at
        ]
          .map(v => `"${v}"`)
          .join(",")
      )
      .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=records.csv");
  res.send(csv);
});

// Get one record
router.get("/:id", requireRole("viewer", "analyst", "admin"), (req, res) => {
  const record = db
    .prepare("SELECT * FROM records WHERE id = ? AND deleted_at IS NULL")
    .get(req.params.id);
  if (!record) return res.status(404).json({ error: "Record not found" });
  res.json(record);
});

// Update record (admin only) + audit
router.patch(
  "/:id",
  requireRole("admin"),
  audit("update", "record"),
  validate(updateRecordSchema),
  (req, res, next) => {
    const record = db
      .prepare("SELECT * FROM records WHERE id = ? AND deleted_at IS NULL")
      .get(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });

    const updated = {
      amount: req.body.amount ?? record.amount,
      type: req.body.type ?? record.type,
      category: req.body.category ?? record.category,
      date: req.body.date ?? record.date,
      notes: req.body.notes ?? record.notes
    };

    db.prepare(
      "UPDATE records SET amount = ?, type = ?, category = ?, date = ?, notes = ? WHERE id = ?"
    ).run(updated.amount, updated.type, updated.category, updated.date, updated.notes, req.params.id);

    const fresh = db.prepare("SELECT * FROM records WHERE id = ?").get(req.params.id);
    res.json(fresh);
    next();
  },
  auditWriter
);

// Soft delete (admin only) + audit
router.delete(
  "/:id",
  requireRole("admin"),
  audit("delete", "record"),
  (req, res, next) => {
    const record = db
      .prepare("SELECT * FROM records WHERE id = ? AND deleted_at IS NULL")
      .get(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });

    db.prepare("UPDATE records SET deleted_at = datetime('now') WHERE id = ?")
      .run(req.params.id);

    res.json({ success: true });
    next();
  },
  auditWriter
);

module.exports = router;
