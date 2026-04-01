const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const config = require("../config");

const dbPath = path.join(process.cwd(), config.DB_FILE);

const db = new Database(dbPath);

// SQLite safety/performance
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

const schemaPath = path.join(__dirname, "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf8");
db.exec(schema);

module.exports = db;
