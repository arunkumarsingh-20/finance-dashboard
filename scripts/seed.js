require("dotenv").config();
const db = require("../src/db/db");
const bcrypt = require("bcryptjs");


const existing = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (existing) {
  console.log("Admin already exists:", existing);
  process.exit(0);
}

const passwordHash = bcrypt.hashSync("password123", 10);

const info = db
  .prepare("INSERT INTO users (name,email,role,status,password) VALUES (?,?,?,?,?)")
  .run("Admin", "admin@example.com", "admin", "active", passwordHash);

const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
console.log("Admin created:", user);
console.log("Default password: password123");
