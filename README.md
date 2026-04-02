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
- **Backend:** Node.js, Express  
- **Database:** PostgreSQL  
- **Validation:** Zod  
- **Auth:** JWT  
- **Frontend:** React (Vite)

---

## Roles & Permissions
- **viewer:** Read records and summary data only  
- **analyst:** Read records and access summaries  
- **admin:** Full access (users + records + audit)

---

## Project Structure
finance-dashboard-backend/
│── src/
│ ├── app.js
│ ├── server.js
│ ├── config.js
│ ├── db/
│ │ ├── db.js
│ │ └── schema.sql
│ ├── middleware/
│ │ ├── auth.js
│ │ ├── rbac.js
│ │ ├── rateLimit.js
│ │ └── audit.js
│ ├── routes/
│ │ ├── auth.js
│ │ ├── users.js
│ │ ├── records.js
│ │ ├── summary.js
│ │ ├── search.js
│ │ └── audit.js
│ └── utils/
│ └── validate.js
│
│── scripts/
│ ├── seed.js
│ └── seedRecords.js
│
│── frontend/ (React UI)


---

## Environment Setup

Create a `.env` file in project root:

PORT=4000
JWT_SECRET=supersecretkey123
DATABASE_URL=postgresql://USER:PASS@HOST:5432/DBNAME
DATABASE_SSL=false
CORS_ORIGIN=http://localhost:5173


---

## Install & Run Backend
```bash
npm install
npm run dev
Seed Admin User
npm run seed
Default admin:

Email: admin@example.com
Password: password123
Run Frontend UI
cd frontend
npm install
npm run dev
Frontend runs at: http://localhost:5173

API Endpoints
Auth
POST /auth/login
GET /auth/me
Users (Admin Only)
POST /users
GET /users
GET /users/:id
PATCH /users/:id
PATCH /users/:id/password
Records
POST /records (admin)
GET /records (viewer/analyst/admin)
GET /records/:id
PATCH /records/:id (admin)
DELETE /records/:id (admin)
Filters:

/records?type=income&category=Salary&startDate=2026-01-01&endDate=2026-12-31&q=rent
Summary
GET /summary
GET /summary/monthly
GET /summary/category
Search
GET /search?q=term (analyst/admin)
Audit (Admin Only)
GET /audit
CSV Export
GET /records/export/csv
Validation & Error Handling
Zod validation for input correctness
Proper HTTP status codes
Clear error messages for invalid requests
Database Models
users (id, name, email, role, status, password)
records (id, amount, type, category, date, notes, created_by, deleted_at)
audit_logs (id, user_id, action, resource, resource_id, created_at)
Optional Enhancements Included
Pagination
Search
Soft delete
Audit logging
CSV export
React testing UI
Assumptions / Tradeoffs
Designed for assessment clarity, not production scaling
Postgres used instead of SQLite for deployment reliability
Mock signup is not implemented; only admin creates users
Architecture Diagram

PostgreSQL
Node.js + Express API
Client
HTTPS / REST
SQL Queries
SQL Queries
Insert Logs
User (Browser)
React (Vite) UI
Auth Middleware (JWT +RBAC)
Routes: Users / Records /Summary / Audit / Search
Validation (Zod)
Audit Logger
users
records
audit_logs
Deployment Notes
Backend: Render
Frontend: Vercel
Set VITE_API_BASE in frontend build environment:
VITE_API_BASE=https://<your-backend>.onrender.com/api/v1
Test Checklist
Login as admin
Create record
Fetch records
Verify summary totals
Export CSV
Check audit logs
