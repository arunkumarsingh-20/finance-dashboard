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
  async (req, res, next) => {
    try {
      const { amount, type, category, date, notes } = req.body;

      const insertRes = await db.query(
        "INSERT INTO records (amount, type, category, date, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [amount, type, category, date, notes || null, req.user.id]
      );

      const newId = insertRes.rows[0].id;
      req._audit.resourceId = newId;

      const recordRes = await db.query("SELECT * FROM records WHERE id = $1", [newId]);
      res.status(201).json(recordRes.rows[0]);
      next();
    } catch (err) {
      next(err);
    }
  },
  auditWriter
);

// List records (viewer/analyst/admin)
router.get("/", requireRole("viewer", "analyst", "admin"), async (req, res, next) => {
  try {
    const { type, category, startDate, endDate, q } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let where = "WHERE deleted_at IS NULL";
    const params = [];
    let i = 1;

    if (type) {
      where += ` AND type = $${i++}`;
      params.push(type);
    }
    if (category) {
      where += ` AND category = $${i++}`;
      params.push(category);
    }
    if (startDate) {
      where += ` AND date >= $${i++}`;
      params.push(startDate);
    }
    if (endDate) {
      where += ` AND date <= $${i++}`;
      params.push(endDate);
    }
    if (q) {
      where += ` AND (category ILIKE $${i} OR notes ILIKE $${i + 1})`;
      params.push(`%${q}%`, `%${q}%`);
      i += 2;
    }

    const countRes = await db.query(`SELECT COUNT(*)::int as total FROM records ${where}`, params);
    const total = countRes.rows[0].total;

    params.push(limit, offset);
    const recordsRes = await db.query(
      `SELECT * FROM records ${where} ORDER BY date DESC LIMIT $${i++} OFFSET $${i}`,
      params
    );

    res.json({
      meta: { total, page, limit },
      data: recordsRes.rows
    });
  } catch (err) {
    next(err);
  }
});

// Export records as CSV (supports filters)
router.get("/export/csv", requireRole("viewer", "analyst", "admin"), async (req, res, next) => {
  try {
    const { type, category, startDate, endDate, q } = req.query;

    let where = "WHERE deleted_at IS NULL";
    const params = [];
    let i = 1;

    if (type) {
      where += ` AND type = $${i++}`;
      params.push(type);
    }
    if (category) {
      where += ` AND category = $${i++}`;
      params.push(category);
    }
    if (startDate) {
      where += ` AND date >= $${i++}`;
      params.push(startDate);
    }
    if (endDate) {
      where += ` AND date <= $${i++}`;
      params.push(endDate);
    }
    if (q) {
      where += ` AND (category ILIKE $${i} OR notes ILIKE $${i + 1})`;
      params.push(`%${q}%`, `%${q}%`);
      i += 2;
    }

    const rowsRes = await db.query(`SELECT * FROM records ${where} ORDER BY date DESC`, params);
    const rows = rowsRes.rows;

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
  } catch (err) {
    next(err);
  }
});

// Get one record
router.get("/:id", requireRole("viewer", "analyst", "admin"), async (req, res, next) => {
  try {
    const recordRes = await db.query(
      "SELECT * FROM records WHERE id = $1 AND deleted_at IS NULL",
      [req.params.id]
    );
    const record = recordRes.rows[0];
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  } catch (err) {
    next(err);
  }
});

// Update record (admin only) + audit
router.patch(
  "/:id",
  requireRole("admin"),
  audit("update", "record"),
  validate(updateRecordSchema),
  async (req, res, next) => {
    try {
      const recordRes = await db.query(
        "SELECT * FROM records WHERE id = $1 AND deleted_at IS NULL",
        [req.params.id]
      );
      const record = recordRes.rows[0];
      if (!record) return res.status(404).json({ error: "Record not found" });

      const updated = {
        amount: req.body.amount ?? record.amount,
        type: req.body.type ?? record.type,
        category: req.body.category ?? record.category,
        date: req.body.date ?? record.date,
        notes: req.body.notes ?? record.notes
      };

      await db.query(
        "UPDATE records SET amount = $1, type = $2, category = $3, date = $4, notes = $5 WHERE id = $6",
        [updated.amount, updated.type, updated.category, updated.date, updated.notes, req.params.id]
      );

      const freshRes = await db.query("SELECT * FROM records WHERE id = $1", [req.params.id]);
      res.json(freshRes.rows[0]);
      next();
    } catch (err) {
      next(err);
    }
  },
  auditWriter
);

// Soft delete (admin only) + audit
router.delete(
  "/:id",
  requireRole("admin"),
  audit("delete", "record"),
  async (req, res, next) => {
    try {
      const recordRes = await db.query(
        "SELECT * FROM records WHERE id = $1 AND deleted_at IS NULL",
        [req.params.id]
      );
      const record = recordRes.rows[0];
      if (!record) return res.status(404).json({ error: "Record not found" });

      await db.query("UPDATE records SET deleted_at = now() WHERE id = $1", [req.params.id]);

      res.json({ success: true });
      next();
    } catch (err) {
      next(err);
    }
  },
  auditWriter
);

module.exports = router;
