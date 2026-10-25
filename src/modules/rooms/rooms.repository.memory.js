// Implementacja in-memory – ten sam interfejs co rooms.repository.knex.js
function createInMemoryRoomsRepository(state) {
  let nextId = Math.max(0, ...state.rooms.map((r) => r.id)) + 1;
  const withBuilding = (room) => {
    const b = state.buildings.find((x) => x.id === room.buildingId);
    return { ...room, building: { id: b.id, name: b.name } };
  };

  return {
    async findAll() {
      return state.rooms.map(withBuilding);
    },
    async findById(id) {
      const room = state.rooms.find((r) => r.id === id);
      return room ? withBuilding(room) : null;
    },
    async findByBuilding(buildingId) {
      return state.rooms.filter((r) => r.buildingId === buildingId).map(withBuilding);
    },
    async create({ buildingId, name, capacity }) {
      const room = { id: nextId++, buildingId, name, capacity, createdAt: new Date() };
      state.rooms.push(room);
      return withBuilding(room);
    },
    async lockById() {
      // w pamięci nie ma współbieżnych transakcji – nic do zablokowania
    },
  };
}

module.exports = { createInMemoryRoomsRepository };
