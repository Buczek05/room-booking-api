// Wysyła równolegle 10 identycznych POST /api/reservations (ta sama sala, ten sam przedział)
// i sprawdza w bazie, ile rezerwacji CONFIRMED faktycznie powstało.
// Użycie: node scripts/double-booking.js
const db = require("../src/db/knex");

const BASE = "http://localhost:3000";
const ROOM_ID = 2;
const START = "2026-12-01T10:00:00.000Z";
const END = "2026-12-01T12:00:00.000Z";

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "jan.kowalski@example.com", password: "jan-demo-password" }), // konto demo z seeda
  });
  return (await res.json()).accessToken;
}

async function book(i, token) {
  const res = await fetch(`${BASE}/api/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ roomId: ROOM_ID, participants: 5, startTime: START, endTime: END }),
  });
  const body = await res.json();
  return { i, status: res.status, code: body.error?.code ?? `id=${body.id}` };
}

(async () => {
  const token = await login();
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => book(i + 1, token)));
  for (const r of results) console.log(`request ${String(r.i).padStart(2)}: ${r.status} ${r.code}`);

  const summary = results.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  console.log("statusy:", JSON.stringify(summary));

  const { count } = await db("reservations")
    .where({ room_id: ROOM_ID, status: "CONFIRMED" })
    .where("start_time", "<", END)
    .where("end_time", ">", START)
    .count({ count: "*" })
    .first();
  console.log(`rezerwacje CONFIRMED w bazie dla sali ${ROOM_ID} w tym przedziale: ${count}`);
  await db.destroy();
})();
