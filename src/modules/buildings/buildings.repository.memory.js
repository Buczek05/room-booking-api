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
    async update(id, changes) {
      const building = state.buildings.find((b) => b.id === id);
      for (const [k, v] of Object.entries(changes)) if (v !== undefined) building[k] = v;
      return withCount(building);
    },
    async delete(id) {
      if (state.rooms.some((r) => r.buildingId === id)) {
        throw Object.assign(new Error("FK"), { code: "23503", constraint: "rooms_building_id_foreign" });
      }
      const i = state.buildings.findIndex((b) => b.id === id);
      if (i === -1) return false;
      state.buildings.splice(i, 1);
      return true;
    },
  };
}

module.exports = { createInMemoryBuildingsRepository };
