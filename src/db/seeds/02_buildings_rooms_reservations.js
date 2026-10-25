const HOUR = 60 * 60 * 1000;

// users: 1 admin, 2 jan.kowalski, 3 anna.nowak, 4 piotr.wisniewski (seed 01_users)
exports.seed = async function (knex) {
  await knex("buildings").insert([
    { name: "Budynek A", address: "ul. Warszawska 24, Kraków" },
    { name: "Budynek B", address: "al. Jana Pawła II 37, Kraków" },
    { name: "Budynek C", address: "ul. Podchorążych 1, Kraków" }, // bez sal
  ]);

  await knex("rooms").insert([
    { building_id: 1, name: "101", capacity: 30 },
    { building_id: 1, name: "102", capacity: 20 },
    { building_id: 1, name: "201", capacity: 50 },
    { building_id: 2, name: "101", capacity: 10 },
    { building_id: 2, name: "Aula", capacity: 120 },
  ]);

  const now = Date.now();
  await knex("reservations").insert([
    { room_id: 1, user_id: 2, participants: 20, start_time: "2026-11-10T10:00:00Z", end_time: "2026-11-10T12:00:00Z" },
    { room_id: 1, user_id: 3, participants: 15, start_time: "2026-11-12T08:00:00Z", end_time: "2026-11-12T09:30:00Z" },
    { room_id: 2, user_id: 4, participants: 10, start_time: "2026-11-10T10:00:00Z", end_time: "2026-11-10T11:00:00Z",
      status: "CANCELLED", cancelled_at: "2026-10-24T09:00:00Z" },
    // rezerwacja, która już się rozpoczęła
    { room_id: 3, user_id: 2, participants: 40, start_time: new Date(now - HOUR), end_time: new Date(now + HOUR),
      created_at: new Date(now - 24 * HOUR) },
    { room_id: 5, user_id: 3, participants: 100, start_time: "2026-11-20T09:00:00Z", end_time: "2026-11-20T15:00:00Z" },
  ]);
};
