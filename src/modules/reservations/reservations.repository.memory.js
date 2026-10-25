const HOUR = 60 * 60 * 1000;

// Seed: rezerwacja, która była poprawna przy tworzeniu, ale już się rozpoczęła.
function defaultSeed(now = new Date()) {
  return [
    {
      id: 1,
      roomId: 3,
      reservedBy: "Seed – trwające spotkanie",
      participants: 10,
      startTime: new Date(now.getTime() - 1 * HOUR),
      endTime: new Date(now.getTime() + 1 * HOUR),
      status: "CONFIRMED",
      createdAt: new Date(now.getTime() - 24 * HOUR),
      cancelledAt: null,
      internalNote: "seed data",
    },
  ];
}

function createInMemoryReservationsRepository(seed = defaultSeed()) {
  const reservations = structuredClone(seed);
  let nextId = Math.max(0, ...reservations.map((r) => r.id)) + 1;

  return {
    async findAll({ roomId } = {}) {
      return reservations.filter((r) => roomId === undefined || r.roomId === roomId);
    },
    async findById(id) {
      return reservations.find((r) => r.id === id) ?? null;
    },
    async findByRoomAndStatus(roomId, status) {
      return reservations.filter((r) => r.roomId === roomId && r.status === status);
    },
    async create(data) {
      const reservation = { id: nextId++, cancelledAt: null, ...data };
      reservations.push(reservation);
      return reservation;
    },
    async update(id, changes) {
      const reservation = reservations.find((r) => r.id === id);
      Object.assign(reservation, changes);
      return reservation;
    },
  };
}

module.exports = { createInMemoryReservationsRepository, defaultSeed };
