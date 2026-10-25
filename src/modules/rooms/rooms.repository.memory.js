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
    async update(id, changes) {
      const room = state.rooms.find((r) => r.id === id);
      for (const [k, v] of Object.entries(changes)) if (v !== undefined) room[k] = v;
      return withBuilding(room);
    },
    async delete(id) {
      if (state.reservations.some((r) => r.roomId === id)) {
        throw Object.assign(new Error("FK"), { code: "23503", constraint: "reservations_room_id_foreign" });
      }
      const i = state.rooms.findIndex((r) => r.id === id);
      if (i === -1) return false;
      state.rooms.splice(i, 1);
      return true;
    },
    async lockById() {
      // w pamięci nie ma współbieżnych transakcji – nic do zablokowania
    },
  };
}

module.exports = { createInMemoryRoomsRepository };
