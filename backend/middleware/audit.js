const db = require("../db/db");

function audit(action, resource) {
  return (req, _res, next) => {
    req._audit = { action, resource, resourceId: null };
    next();
  };
}

async function auditWriter(req, _res, next) {
  try {
    const info = req._audit;
    if (info && req.user) {
      const resourceId = info.resourceId ?? (req.params.id ? Number(req.params.id) : null);

      await db.query(
        "INSERT INTO audit_logs (user_id, action, resource, resource_id) VALUES ($1, $2, $3, $4)",
        [req.user.id, info.action, info.resource, resourceId]
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { audit, auditWriter };