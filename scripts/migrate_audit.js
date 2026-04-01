require("dotenv").config();
const db = require("../src/db/db");

async function run() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  console.log("Audit log table ready");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
