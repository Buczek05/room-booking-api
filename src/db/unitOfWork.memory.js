const { createInMemoryBuildingsRepository } = require("../modules/buildings/buildings.repository.memory");
const { createInMemoryRoomsRepository } = require("../modules/rooms/rooms.repository.memory");
const { createInMemoryReservationsRepository } = require("../modules/reservations/reservations.repository.memory");
const { createInMemoryUsersRepository } = require("../modules/users/users.repository.memory");
const { createInMemoryAuditLogRepository } = require("../modules/audit/auditLog.repository.memory");

const HOUR = 60 * 60 * 1000;

function defaultSeed(now = new Date()) {
  return {
    users: [
      // hasło demo: admin-demo-password / jan-demo-password (bcrypt, cost 12)
      { id: 1, email: "admin@roombooking.local", role: "ADMIN", createdAt: now,
        passwordHash: "$2b$12$AtGkUuWV6uCwZfcrq5rpxehVdA06m7C2Tew8NVtwP8.ckO7QIa/IO" },
      { id: 2, email: "jan.kowalski@example.com", role: "USER", createdAt: now,
        passwordHash: "$2b$12$GzGWXvW/.x8fbbAHBW6VJeTtXJdbQq8xWMSsP8L8kTivP1scuCqQG" },
    ],
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
      { id: 1, roomId: 3, userId: 2, participants: 10,
        startTime: new Date(now.getTime() - HOUR), endTime: new Date(now.getTime() + HOUR),
        status: "CONFIRMED", createdAt: new Date(now.getTime() - 24 * HOUR), cancelledAt: null },
    ],
  };
}

// Wersja in-memory: brak transakcji, więc runInTransaction po prostu wywołuje funkcję
function createInMemoryUnitOfWork(seed = defaultSeed()) {
  const state = { users: [], buildings: [], rooms: [], reservations: [], auditLog: [], ...structuredClone(seed) };
  const repositories = {
    buildings: createInMemoryBuildingsRepository(state),
    rooms: createInMemoryRoomsRepository(state),
    reservations: createInMemoryReservationsRepository(state),
    users: createInMemoryUsersRepository(state),
    auditLog: createInMemoryAuditLogRepository(state),
  };
  return { repositories, runInTransaction: (fn) => fn(repositories) };
}

module.exports = { createInMemoryUnitOfWork, defaultSeed };
