const bcrypt = require("bcryptjs");

// Hasła wyłącznie dla danych demo (lokalna baza deweloperska)
const DEMO_USERS = [
  { email: "admin@roombooking.local", password: "admin-demo-password", role: "ADMIN" },
  { email: "jan.kowalski@example.com", password: "jan-demo-password", role: "USER" },
  { email: "anna.nowak@example.com", password: "anna-demo-password", role: "USER" },
  { email: "piotr.wisniewski@example.com", password: "piotr-demo-password", role: "USER" },
];

exports.seed = async function (knex) {
  // czyścimy wszystko raz, na początku – kolejne seedy tylko wstawiają dane
  await knex.raw("TRUNCATE reservations, rooms, buildings, users RESTART IDENTITY CASCADE");
  const rows = [];
  for (const u of DEMO_USERS) {
    rows.push({ email: u.email, password_hash: await bcrypt.hash(u.password, 12), role: u.role });
  }
  await knex("users").insert(rows);
};
