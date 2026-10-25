// whitelist sortowania: wartość z API -> kolumna w bazie (nigdy surowy input w ORDER BY)
const SORT_COLUMNS = {
  startTime: "r.start_time",
  createdAt: "r.created_at",
  participants: "r.participants",
};

function toReservation(row) {
  if (!row) return null;
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    participants: row.participants,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
    room: row.room_name === undefined ? undefined : {
      id: row.room_id,
      name: row.room_name,
      building: { id: row.building_id, name: row.building_name },
    },
    user: row.user_email === undefined ? undefined : { id: row.user_id, email: row.user_email },
  };
}

function createReservationsRepository(db) {
  // rezerwacja + sala + budynek + użytkownik w jednym zapytaniu (stała liczba zapytań, brak N+1)
  const withRoomAndBuilding = () =>
    db("reservations as r")
      .join("rooms as ro", "ro.id", "r.room_id")
      .join("buildings as b", "b.id", "ro.building_id")
      .join("users as u", "u.id", "r.user_id");

  const COLUMNS = [
    "r.id", "r.room_id", "r.user_id", "r.participants", "r.start_time", "r.end_time",
    "r.status", "r.created_at", "r.cancelled_at",
    "ro.name as room_name", "b.id as building_id", "b.name as building_name", "u.email as user_email",
  ];

  return {
    async list({ roomId, buildingId, userId, status, from, to, page = 1, limit = 20, sort = "startTime" } = {}) {
      const base = withRoomAndBuilding().modify((qb) => {
        if (roomId !== undefined) qb.where("r.room_id", roomId);
        if (buildingId !== undefined) qb.where("ro.building_id", buildingId);
        if (userId !== undefined) qb.where("r.user_id", userId);
        if (status !== undefined) qb.where("r.status", status);
        // nakładanie przedziałów [from, to) z [start_time, end_time)
        if (to !== undefined) qb.where("r.start_time", "<", to);
        if (from !== undefined) qb.where("r.end_time", ">", from);
      });

      const desc = sort.startsWith("-");
      const column = SORT_COLUMNS[desc ? sort.slice(1) : sort];

      const [rows, { count }] = await Promise.all([
        base.clone()
          .select(COLUMNS)
          .orderBy(column, desc ? "desc" : "asc")
          .orderBy("r.id", "asc") // tie-breaker
          .limit(limit)
          .offset((page - 1) * limit),
        base.clone().count({ count: "*" }).first(),
      ]);

      return { items: rows.map(toReservation), total: Number(count) };
    },
    async findById(id) {
      return toReservation(await withRoomAndBuilding().select(COLUMNS).where("r.id", id).first());
    },
    async findByRoomAndStatus(roomId, status) {
      const rows = await db("reservations").where({ room_id: roomId, status });
      return rows.map(toReservation);
    },
    async create({ roomId, userId, participants, startTime, endTime, status, createdAt }) {
      const [row] = await db("reservations")
        .insert({
          room_id: roomId,
          user_id: userId,
          participants,
          start_time: startTime,
          end_time: endTime,
          status,
          created_at: createdAt,
        })
        .returning("id");
      return this.findById(row.id);
    },
    async update(id, { status, cancelledAt }) {
      await db("reservations").where({ id }).update({ status, cancelled_at: cancelledAt });
      return this.findById(id);
    },
  };
}

module.exports = { createReservationsRepository };
