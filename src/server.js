const db = require("./db/knex");
const { createApp } = require("./app");
const { createKnexUnitOfWork } = require("./db/unitOfWork.knex");
// const { createInMemoryUnitOfWork } = require("./db/unitOfWork.memory");

// Composition root – jedyne miejsce, w którym wybieramy implementację repositories
const { runInTransaction } = createKnexUnitOfWork(db);
// const { runInTransaction } = createInMemoryUnitOfWork();

const app = createApp({ runInTransaction, now: () => new Date() });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
