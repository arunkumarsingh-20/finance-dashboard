require("dotenv").config();
const db = require("../src/db/db");

async function run() {
  const colsRes = await db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name='records' AND column_name='deleted_at'
  `);

  const hasDeleted = colsRes.rows.length > 0;

  if (!hasDeleted) {
    await db.query("ALTER TABLE records ADD COLUMN deleted_at TIMESTAMPTZ");
    console.log("Migration applied: added deleted_at column");
  } else {
    console.log("Migration already applied");
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
