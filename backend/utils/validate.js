const { AppError } = require("./errors");

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.errors.map(e => e.message).join(", ");
      return next(new AppError(msg, 400));
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
