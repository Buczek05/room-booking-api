const HOUR = 60 * 60 * 1000;

exports.seed = async function (knex) {
  // czyści tabele i resetuje ID – każde seed:run daje ten sam stan
  await knex.raw("TRUNCATE reservations, rooms, buildings RESTART IDENTITY CASCADE");

  await knex("buildings").insert([
    { name: "Budynek A", address: "ul. Warszawska 24, Kraków" },
    { name: "Budynek B", address: "al. Jana Pawła II 37, Kraków" },
    { name: "Budynek C", address: "ul. Podchorążych 1, Kraków" }, // bez sal
  ]);

  await knex("rooms").insert([
    { building_id: 1, name: "101", capacity: 30 },
    { building_id: 1, name: "102", capacity: 20 },
    { building_id: 1, name: "201", capacity: 50 },
    { building_id: 2, name: "101", capacity: 10 }, // ta sama nazwa w innym budynku – OK
    { building_id: 2, name: "Aula", capacity: 120 },
  ]);

  const now = Date.now();
  await knex("reservations").insert([
    { room_id: 1, reserved_by: "Jan Kowalski", participants: 20, start_time: "2026-11-10T10:00:00Z", end_time: "2026-11-10T12:00:00Z" },
    { room_id: 1, reserved_by: "Anna Nowak", participants: 15, start_time: "2026-11-12T08:00:00Z", end_time: "2026-11-12T09:30:00Z" },
    { room_id: 2, reserved_by: "Piotr Wiśniewski", participants: 10, start_time: "2026-11-10T10:00:00Z", end_time: "2026-11-10T11:00:00Z",
      status: "CANCELLED", cancelled_at: "2026-10-24T09:00:00Z" },
    // rezerwacja, która już się rozpoczęła
    { room_id: 3, reserved_by: "Katarzyna Zielińska", participants: 40, start_time: new Date(now - HOUR), end_time: new Date(now + HOUR),
      created_at: new Date(now - 24 * HOUR) },
    { room_id: 5, reserved_by: "Tomasz Lewandowski", participants: 100, start_time: "2026-11-20T09:00:00Z", end_time: "2026-11-20T15:00:00Z" },
  ]);
};
