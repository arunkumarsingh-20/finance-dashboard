# Finance Dashboard Backend (Full‑Stack Submission)

A role‑based finance dashboard backend with records management, summary analytics, audit logs, and a React UI for testing. Built to demonstrate backend design, access control, validation, and data modeling.

---

## Overview
This project implements a finance dashboard API where different roles (viewer, analyst, admin) interact with financial records based on permissions. It includes CRUD operations, summaries, search, and auditing.

---

## Features
- Role‑based access control (viewer, analyst, admin)
- JWT authentication
- Financial record CRUD
- Filters (type, category, date range, search)
- Summary analytics (totals, category, monthly)
- Audit logs for record changes
- CSV export
- Soft delete for records
- Input validation with Zod
- Rate limiting
- Testing UI (React)

---

## Tech Stack
- Node.js + Express
- SQLite (file-based)
- better-sqlite3
- Zod for validation

## Setup
```bash
npm install
npm run dev
