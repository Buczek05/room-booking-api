const { AppError } = require("../errors/AppError");

// Błędy constraintów PostgreSQL -> odpowiedzi HTTP (bez szczegółów bazy dla klienta)
const UNIQUE_VIOLATIONS = {
  buildings_name_unique: { code: "BUILDING_NAME_TAKEN", message: "Building with this name already exists" },
  rooms_building_id_name_unique: { code: "ROOM_NAME_TAKEN", message: "Room with this name already exists in this building" },
  users_email_unique: { code: "EMAIL_TAKEN", message: "Email already registered" },
};

const FK_VIOLATIONS = {
  rooms_building_id_foreign: { code: "BUILDING_HAS_ROOMS", message: "Building has rooms and cannot be deleted" },
  reservations_room_id_foreign: { code: "ROOM_HAS_RESERVATIONS", message: "Room has reservations and cannot be deleted" },
};

function dbErrorResponse(err) {
  switch (err.code) {
    case "23505": // unique_violation
      return { status: 409, ...(UNIQUE_VIOLATIONS[err.constraint] ?? { code: "ALREADY_EXISTS", message: "Resource already exists" }) };
    case "23P01": // exclusion_violation
      return { status: 409, code: "ROOM_ALREADY_BOOKED", message: "Room is already booked in this time range" };
    case "23503": // foreign_key_violation
      return { status: 409, ...(FK_VIOLATIONS[err.constraint] ?? { code: "RELATED_RESOURCE_CONFLICT", message: "Operation conflicts with related resources" }) };
    case "23514": // check_violation
      return { status: 400, code: "CONSTRAINT_VIOLATION", message: "Data violates a database constraint" };
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars -- Express rozpoznaje error handler po 4 parametrach
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details, requestId: req.id },
    });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "Request body is not valid JSON", requestId: req.id },
    });
  }

  const dbError = dbErrorResponse(err);
  if (dbError) {
    return res.status(dbError.status).json({
      error: { code: dbError.code, message: dbError.message, requestId: req.id },
    });
  }

  console.error(`[${req.id}]`, err); // stack trace tylko w logach servera
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Unexpected error", requestId: req.id },
  });
}

module.exports = errorHandler;
