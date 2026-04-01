require("dotenv").config();
const db = require("../src/db/db");
const bcrypt = require("bcryptjs");

async function run() {
  // Check if password column exists
  const colsRes = await db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name='users' AND column_name='password'
  `);

  const hasPassword = colsRes.rows.length > 0;

  if (!hasPassword) {
    await db.query("ALTER TABLE users ADD COLUMN password TEXT");
    const hash = bcrypt.hashSync("password123", 10);
    await db.query("UPDATE users SET password = $1 WHERE password IS NULL", [hash]);

    console.log("Migration applied: added password column");
    console.log("Default password for existing users: password123");
  } else {
    console.log("Migration already applied");
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
