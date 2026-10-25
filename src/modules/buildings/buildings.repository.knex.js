function toBuilding(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    createdAt: row.created_at,
    roomsCount: Number(row.rooms_count ?? 0),
  };
}

function createBuildingsRepository(db) {
  // LEFT JOIN + GROUP BY: budynki bez sal też są zwracane (rooms_count = 0)
  const withRoomsCount = () =>
    db("buildings as b")
      .leftJoin("rooms as r", "r.building_id", "b.id")
      .groupBy("b.id")
      .select("b.id", "b.name", "b.address", "b.created_at")
      .count({ rooms_count: "r.id" });

  return {
    async findAll() {
      const rows = await withRoomsCount().orderBy("b.id", "asc");
      return rows.map(toBuilding);
    },
    async findById(id) {
      return toBuilding(await withRoomsCount().where("b.id", id).first());
    },
    async create({ name, address }) {
      const [row] = await db("buildings").insert({ name, address }).returning("id");
      return this.findById(row.id);
    },
    async update(id, { name, address }) {
      await db("buildings").where({ id }).update({ name, address });
      return this.findById(id);
    },
    async delete(id) {
      return (await db("buildings").where({ id }).delete()) > 0;
    },
  };
}

module.exports = { createBuildingsRepository };
