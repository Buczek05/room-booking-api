const { ForbiddenError, UnauthorizedError } = require("../errors/AppError");

// Kontrola ról: 401 gdy nie wiemy, kim jest użytkownik, 403 gdy rola nie pozwala
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!allowedRoles.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };
}

module.exports = authorize;
