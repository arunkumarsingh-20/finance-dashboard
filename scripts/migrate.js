const db = require("../src/db/db");

const cols = db.prepare("PRAGMA table_info(records)").all();
const hasDeleted = cols.some(c => c.name === "deleted_at");

if (!hasDeleted) {
  db.prepare("ALTER TABLE records ADD COLUMN deleted_at TEXT").run();
  console.log("Migration applied: added deleted_at column");
} else {
  console.log("Migration already applied");
}
