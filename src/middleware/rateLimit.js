const { AppError } = require("../utils/errors");

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 300;


const store = new Map();

function rateLimit(req, _res, next) {
  const key = req.user ? `user:${req.user.id}` : req.ip;
  const now = Date.now();

  if (!store.has(key)) {
    store.set(key, { count: 1, start: now });
    return next();
  }

  const data = store.get(key);
  if (now - data.start > WINDOW_MS) {
    store.set(key, { count: 1, start: now });
    return next();
  }

  data.count += 1;
  if (data.count > MAX_REQUESTS) {
    return next(new AppError("Too many requests. Try again in a minute.", 429));
  }

  next();
}

module.exports = { rateLimit };
