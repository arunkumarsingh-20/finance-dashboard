const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const config = require("../config");

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DATABASE_SSL ? { rejectUnauthorized: false } : false
});

async function init() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schema);
}

init().catch((err) => {
  console.error("DB init failed:", err);
  process.exit(1);
});

module.exports = {
  query: (text, params) => pool.query(text, params)
};
