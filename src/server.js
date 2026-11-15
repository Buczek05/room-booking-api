const config = require("./config");
const db = require("./db/knex");
const { createApp } = require("./app");
const { createKnexUnitOfWork } = require("./db/unitOfWork.knex");
const { createEventBus } = require("./events/eventBus");
const { registerAuditListeners } = require("./events/auditListeners");
const { registerNotificationListeners } = require("./events/notificationListeners");

// Composition root – jedyne miejsce, w którym wybieramy implementacje i podpinamy listenery
const { runInTransaction } = createKnexUnitOfWork(db);
const eventBus = createEventBus();
registerAuditListeners(eventBus, { runInTransaction });
registerNotificationListeners(eventBus, { runInTransaction });

const app = createApp({ config, runInTransaction, eventBus, now: () => new Date() });

const server = app.listen(config.PORT, () => console.log(`Server running on http://localhost:${config.PORT}`));

// Graceful shutdown: przestajemy przyjmować połączenia, kończymy trwające requesty, zamykamy pulę
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await db.destroy();
    console.log("HTTP server closed, database pool closed – bye");
    process.exit(0);
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
