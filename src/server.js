const config = require("./config");
const db = require("./db/knex");
const { createApp } = require("./app");
const { createKnexUnitOfWork } = require("./db/unitOfWork.knex");
// const { createInMemoryUnitOfWork } = require("./db/unitOfWork.memory");

// Composition root – jedyne miejsce, w którym wybieramy implementację repositories
const { runInTransaction } = createKnexUnitOfWork(db);
// const { runInTransaction } = createInMemoryUnitOfWork();

const app = createApp({ config, runInTransaction, now: () => new Date() });

app.listen(config.PORT, () => console.log(`Server running on http://localhost:${config.PORT}`));
