const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiDocument = require("./docs/openapi");
const requestLogger = require("./middleware/requestLogger");
const authenticate = require("./middleware/authenticate");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const { createAuthService } = require("./modules/auth/auth.service");
const { createAuthController } = require("./modules/auth/auth.controller");
const { createAuthRouter } = require("./modules/auth/auth.routes");

const { createBuildingsService } = require("./modules/buildings/buildings.service");
const { createBuildingsController } = require("./modules/buildings/buildings.controller");
const { createBuildingsRouter } = require("./modules/buildings/buildings.routes");

const { createRoomsService } = require("./modules/rooms/rooms.service");
const { createRoomsController } = require("./modules/rooms/rooms.controller");
const { createRoomsRouter } = require("./modules/rooms/rooms.routes");

const { createReservationsService } = require("./modules/reservations/reservations.service");
const { createReservationsController } = require("./modules/reservations/reservations.controller");
const { createReservationsRouter } = require("./modules/reservations/reservations.routes");

// Buduje aplikację, ale jej nie uruchamia
function createApp({ config, runInTransaction, now = () => new Date() }) {
  const app = express();

  app.use(requestLogger);
  app.use(express.json());

  const requireAuth = authenticate(config.JWT_SECRET);

  const authService = createAuthService({
    runInTransaction,
    jwtSecret: config.JWT_SECRET,
    jwtExpiresIn: config.JWT_EXPIRES_IN,
  });
  const buildingsService = createBuildingsService({ runInTransaction });
  const roomsService = createRoomsService({ runInTransaction });
  const reservationsService = createReservationsService({ runInTransaction, now });

  // publiczne: dokumentacja, rejestracja, logowanie
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
  app.use("/api/auth", createAuthRouter(createAuthController(authService), requireAuth));

  // wszystko poniżej wymaga tokenu – requireAuth na poziomie całego modułu
  app.use("/api/buildings", requireAuth, createBuildingsRouter(createBuildingsController(buildingsService)));
  app.use("/api/rooms", requireAuth, createRoomsRouter(createRoomsController(roomsService)));
  app.use("/api/reservations", requireAuth, createReservationsRouter(createReservationsController(reservationsService)));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
