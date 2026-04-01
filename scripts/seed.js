require("dotenv").config();
const db = require("../src/db/db");
const bcrypt = require("bcryptjs");

async function run() {
  const existingRes = await db.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
  const existing = existingRes.rows[0];
  if (existing) {
    console.log("Admin already exists:", existing);
    process.exit(0);
  }

  const passwordHash = bcrypt.hashSync("password123", 10);

  const insertRes = await db.query(
    "INSERT INTO users (name,email,role,status,password) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    ["Admin", "admin@example.com", "admin", "active", passwordHash]
  );

  const userId = insertRes.rows[0].id;
  const userRes = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
  console.log("Admin created:", userRes.rows[0]);
  console.log("Default password: password123");

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

