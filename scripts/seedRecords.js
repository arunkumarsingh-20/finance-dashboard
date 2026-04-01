const db = require("../src/db/db");

const admin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!admin) {
  console.log("No admin found. Run npm run seed first.");
  process.exit(1);
}

const sample = [
  [5000, "income", "Salary", "2026-04-01", "April salary"],
  [200, "expense", "Snacks", "2026-04-02", "Evening snacks"],
  [800, "expense", "Groceries", "2026-04-03", "Monthly groceries"],
  [1200, "income", "Freelance", "2026-03-28", "Client payment"]
];

const stmt = db.prepare(
  "INSERT INTO records (amount, type, category, date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)"
);

for (const r of sample) {
  stmt.run(...r, admin.id);
}

console.log("Sample records added");
