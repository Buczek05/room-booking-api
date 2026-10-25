const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../errors/AppError");

function authenticate(jwtSecret) {
  return (req, res, next) => {
    const header = req.get("Authorization");
    if (!header) return next(new UnauthorizedError("Missing Authorization header"));

    const [scheme, token, ...rest] = header.split(" ");
    if (scheme !== "Bearer" || !token || rest.length > 0) {
      return next(new UnauthorizedError("Authorization header must be: Bearer <token>"));
    }

    try {
      // jawnie określony algorytm – token z alg "none" albo innym algorytmem jest odrzucany
      const payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
      req.user = { id: Number(payload.sub), role: payload.role };
      next();
    } catch (err) {
      next(new UnauthorizedError(err.name === "TokenExpiredError" ? "Token expired" : "Invalid token"));
    }
  };
}

module.exports = authenticate;
