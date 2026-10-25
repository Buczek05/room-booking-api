// Implementacja in-memory – ten sam interfejs co reservations.repository.knex.js
const SORT_FIELDS = { startTime: "startTime", createdAt: "createdAt", participants: "participants" };
const ts = (v) => new Date(v).getTime();

function createInMemoryReservationsRepository(state) {
  let nextId = Math.max(0, ...state.reservations.map((r) => r.id)) + 1;

  const withRoom = (res) => {
    const room = state.rooms.find((r) => r.id === res.roomId);
    const b = state.buildings.find((x) => x.id === room.buildingId);
    const user = state.users.find((u) => u.id === res.userId);
    return { ...res, room: { id: room.id, name: room.name, building: { id: b.id, name: b.name } },
      user: { id: user.id, email: user.email } };
  };

  return {
    async list({ roomId, buildingId, userId, status, from, to, page = 1, limit = 20, sort = "startTime" } = {}) {
      const desc = sort.startsWith("-");
      const field = SORT_FIELDS[desc ? sort.slice(1) : sort];
      const matching = state.reservations
        .map(withRoom)
        .filter((r) =>
          (roomId === undefined || r.roomId === roomId) &&
          (buildingId === undefined || r.room.building.id === buildingId) &&
          (userId === undefined || r.userId === userId) &&
          (status === undefined || r.status === status) &&
          (to === undefined || ts(r.startTime) < ts(to)) &&
          (from === undefined || ts(r.endTime) > ts(from)))
        .sort((a, b) => {
          const va = field === "participants" ? a[field] : ts(a[field]);
          const vb = field === "participants" ? b[field] : ts(b[field]);
          return (desc ? vb - va : va - vb) || a.id - b.id;
        });
      return { items: matching.slice((page - 1) * limit, page * limit), total: matching.length };
    },
    async findById(id) {
      const res = state.reservations.find((r) => r.id === id);
      return res ? withRoom(res) : null;
    },
    async findByRoomAndStatus(roomId, status) {
      return state.reservations.filter((r) => r.roomId === roomId && r.status === status);
    },
    async create(data) {
      const reservation = { id: nextId++, cancelledAt: null, ...data };
      state.reservations.push(reservation);
      return withRoom(reservation);
    },
    async update(id, changes) {
      const reservation = state.reservations.find((r) => r.id === id);
      Object.assign(reservation, changes);
      return withRoom(reservation);
    },
  };
}

module.exports = { createInMemoryReservationsRepository };
