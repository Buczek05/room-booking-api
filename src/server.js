const { createApp } = require("./app");
const { createInMemoryRoomsRepository } = require("./modules/rooms/rooms.repository.memory");
const { createInMemoryReservationsRepository } = require("./modules/reservations/reservations.repository.memory");

// Composition root – jedyne miejsce, które tworzy konkretne repositories
const app = createApp({
  roomsRepository: createInMemoryRoomsRepository(),
  reservationsRepository: createInMemoryReservationsRepository(),
  now: () => new Date(),
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
