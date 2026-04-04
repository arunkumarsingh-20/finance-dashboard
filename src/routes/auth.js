const express = require("express");
const { z } = require("zod");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/db");
const { mockAuth } = require("../middleware/auth");
const config = require("../config");

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const { email, password } = parsed.data;

    const userRes = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = userRes.rows[0];

    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.status !== "active") return res.status(403).json({ error: "User inactive" });

    const ok = bcrypt.compareSync(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get("/me", mockAuth, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    status: req.user.status
  });
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Logout success. Please delete token on client." });
});

module.exports = router;
