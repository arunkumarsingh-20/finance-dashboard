# Finance Dashboard API (Quick Reference)

Base URL (versioned):
http://localhost:4000/api/v1

Auth:
- POST /auth/login  -> returns JWT token
- GET /auth/me      -> returns current user

Users (admin only):
- POST /users
- GET /users
- GET /users/:id
- PATCH /users/:id
- PATCH /users/:id/password

Records:
- POST /records (admin)
- GET /records (viewer/analyst/admin)
- GET /records/:id
- PATCH /records/:id (admin)
- DELETE /records/:id (admin)
- GET /records/export/csv

Filters:
- /records?type=income&category=Salary&startDate=2026-01-01&endDate=2026-12-31
- /records?page=1&limit=10&q=salary

Summary:
- GET /summary
- GET /summary/monthly
- GET /summary/weekly
- GET /summary/category
- GET /summary/type
- GET /summary/admin/activity (admin)

Search:
- GET /search?q=term (analyst/admin)

Audit:
- GET /audit (admin)

Headers:
- Authorization: Bearer <token>
OR (mock)
- x-user-id: 1
