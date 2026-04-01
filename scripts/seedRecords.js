require("dotenv").config();
const db = require("../src/db/db");

async function run() {
  const adminRes = await db.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
  const admin = adminRes.rows[0];
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

  for (const r of sample) {
    await db.query(
      "INSERT INTO records (amount, type, category, date, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6)",
      [...r, admin.id]
    );
  }

  console.log("Sample records added");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
