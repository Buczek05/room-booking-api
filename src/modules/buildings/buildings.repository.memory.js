// Implementacja in-memory – ten sam interfejs co buildings.repository.knex.js
function createInMemoryBuildingsRepository(state) {
  let nextId = Math.max(0, ...state.buildings.map((b) => b.id)) + 1;
  const withCount = (b) => ({ ...b, roomsCount: state.rooms.filter((r) => r.buildingId === b.id).length });

  return {
    async findAll() {
      return state.buildings.map(withCount);
    },
    async findById(id) {
      const building = state.buildings.find((b) => b.id === id);
      return building ? withCount(building) : null;
    },
    async create({ name, address }) {
      const building = { id: nextId++, name, address, createdAt: new Date() };
      state.buildings.push(building);
      return withCount(building);
    },
  };
}

module.exports = { createInMemoryBuildingsRepository };
