const db = require("../db/db");

function audit(action, resource) {
  return (req, _res, next) => {
    req._audit = { action, resource, resourceId: null };
    next();
  };
}

function auditWriter(req, _res, next) {
  const info = req._audit;
  if (info && req.user) {
    const resourceId = info.resourceId ?? (req.params.id ? Number(req.params.id) : null);

    db.prepare(
      "INSERT INTO audit_logs (user_id, action, resource, resource_id) VALUES (?, ?, ?, ?)"
    ).run(req.user.id, info.action, info.resource, resourceId);
  }
  next();
}

module.exports = { audit, auditWriter };
