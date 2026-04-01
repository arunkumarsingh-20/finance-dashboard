const express = require("express");
const { z } = require("zod");
const bcrypt = require("bcryptjs");
const db = require("../db/db");
const { validate } = require("../utils/validate");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

const createUserSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email"),
  role: z.enum(["viewer", "analyst", "admin"]),
  status: z.enum(["active", "inactive"]).optional(),
  password: z.string().min(6, "Password too short")
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["viewer", "analyst", "admin"]).optional(),
  status: z.enum(["active", "inactive"]).optional()
});

const passwordSchema = z.object({
  password: z.string().min(6, "Password too short")
});

// Admin only
router.post("/", requireRole("admin"), validate(createUserSchema), (req, res, next) => {
  try {
    const { name, email, role, status = "active", password } = req.body;
    const hash = bcrypt.hashSync(password, 10);

    const stmt = db.prepare(
      "INSERT INTO users (name, email, role, status, password) VALUES (?, ?, ?, ?, ?)"
    );
    const info = stmt.run(name, email, role, status, hash);

    const user = db
      .prepare("SELECT id, name, email, role, status, created_at FROM users WHERE id = ?")
      .get(info.lastInsertRowid);

    res.status(201).json(user);
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      err.message = "Email already exists";
      err.status = 409;
    }
    next(err);
  }
});

// Admin only
router.get("/", requireRole("admin"), (req, res) => {
  const { status } = req.query;
  if (status) {
    const users = db
      .prepare("SELECT id, name, email, role, status, created_at FROM users WHERE status = ? ORDER BY id DESC")
      .all(status);
    return res.json(users);
  }

  const users = db
    .prepare("SELECT id, name, email, role, status, created_at FROM users ORDER BY id DESC")
    .all();
  res.json(users);
});

// Admin only
router.get("/:id", requireRole("admin"), (req, res) => {
  const user = db
    .prepare("SELECT id, name, email, role, status, created_at FROM users WHERE id = ?")
    .get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// Admin only
router.patch("/:id", requireRole("admin"), validate(updateUserSchema), (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const updates = {
    name: req.body.name ?? user.name,
    role: req.body.role ?? user.role,
    status: req.body.status ?? user.status
  };

  db.prepare(
    "UPDATE users SET name = ?, role = ?, status = ? WHERE id = ?"
  ).run(updates.name, updates.role, updates.status, req.params.id);

  const updated = db
    .prepare("SELECT id, name, email, role, status, created_at FROM users WHERE id = ?")
    .get(req.params.id);

  res.json(updated);
});

// Admin or Self: change password
router.patch("/:id/password", validate(passwordSchema), (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (req.user.role !== "admin" && req.user.id !== targetId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const hash = bcrypt.hashSync(req.body.password, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, targetId);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
