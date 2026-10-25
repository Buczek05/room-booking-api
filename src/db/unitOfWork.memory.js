const { createInMemoryBuildingsRepository } = require("../modules/buildings/buildings.repository.memory");
const { createInMemoryRoomsRepository } = require("../modules/rooms/rooms.repository.memory");
const { createInMemoryReservationsRepository } = require("../modules/reservations/reservations.repository.memory");

const HOUR = 60 * 60 * 1000;

function defaultSeed(now = new Date()) {
  return {
    buildings: [
      { id: 1, name: "Budynek A", address: "ul. Warszawska 24, Kraków", createdAt: now },
      { id: 2, name: "Budynek B", address: "al. Jana Pawła II 37, Kraków", createdAt: now },
    ],
    rooms: [
      { id: 1, buildingId: 1, name: "101", capacity: 30, createdAt: now },
      { id: 2, buildingId: 1, name: "102", capacity: 20, createdAt: now },
      { id: 3, buildingId: 2, name: "Aula", capacity: 120, createdAt: now },
    ],
    reservations: [
      { id: 1, roomId: 3, reservedBy: "Seed – trwające spotkanie", participants: 10,
        startTime: new Date(now.getTime() - HOUR), endTime: new Date(now.getTime() + HOUR),
        status: "CONFIRMED", createdAt: new Date(now.getTime() - 24 * HOUR), cancelledAt: null },
    ],
  };
}

// Wersja in-memory: brak transakcji, więc runInTransaction po prostu wywołuje funkcję
function createInMemoryUnitOfWork(seed = defaultSeed()) {
  const state = structuredClone(seed);
  const repositories = {
    buildings: createInMemoryBuildingsRepository(state),
    rooms: createInMemoryRoomsRepository(state),
    reservations: createInMemoryReservationsRepository(state),
  };
  return { repositories, runInTransaction: (fn) => fn(repositories) };
}

module.exports = { createInMemoryUnitOfWork, defaultSeed };
