# Assumptions & Decisions

1. Authentication
- JWT login for production-like usage.
- Mock header `x-user-id` retained for easier testing.

2. Roles
- viewer: read-only
- analyst: read + summaries + search
- admin: full access + user management

3. Data Storage
- SQLite used for simplicity and portability.

4. Deletion
- Records use soft delete (`deleted_at`) to avoid data loss.

5. Validation
- Zod used for input validation.
- Date format enforced as YYYY-MM-DD.

6. Rate Limiting
- Simple in-memory rate limit for demo purposes.

7. Audit Logging
- Admin actions on records tracked in audit logs.
