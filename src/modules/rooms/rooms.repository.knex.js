function toRoom(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    capacity: row.capacity,
    buildingId: row.building_id,
    createdAt: row.created_at,
    building: { id: row.building_id, name: row.building_name },
  };
}

function createRoomsRepository(db) {
  // jedno zapytanie z JOIN – sala razem z budynkiem, bez N+1
  const withBuilding = () =>
    db("rooms as r")
      .join("buildings as b", "b.id", "r.building_id")
      .select("r.id", "r.name", "r.capacity", "r.building_id", "r.created_at", "b.name as building_name");

  return {
    async findAll() {
      return (await withBuilding().orderBy("r.id", "asc")).map(toRoom);
    },
    async findById(id) {
      return toRoom(await withBuilding().where("r.id", id).first());
    },
    async findByBuilding(buildingId) {
      return (await withBuilding().where("r.building_id", buildingId).orderBy("r.id", "asc")).map(toRoom);
    },
    async create({ buildingId, name, capacity }) {
      const [row] = await db("rooms").insert({ building_id: buildingId, name, capacity }).returning("id");
      return this.findById(row.id);
    },
    // blokada wiersza sali do końca transakcji (SELECT ... FOR UPDATE)
    async lockById(id) {
      await db("rooms").where({ id }).forUpdate().first();
    },
  };
}

module.exports = { createRoomsRepository };
