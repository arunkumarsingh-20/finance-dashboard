const db = require("../src/db/db");

const cols = db.prepare("PRAGMA table_info(users)").all();
const hasPassword = cols.some(c => c.name === "password");

if (!hasPassword) {
  db.prepare("ALTER TABLE users ADD COLUMN password TEXT").run();
  // set default password for existing users
  const bcrypt = require("bcryptjs");
  const hash = bcrypt.hashSync("password123", 10);
  db.prepare("UPDATE users SET password = ? WHERE password IS NULL").run(hash);

  console.log("Migration applied: added password column");
  console.log("Default password for existing users: password123");
} else {
  console.log("Migration already applied");
}
