const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");

// "Jan Kowalski" -> "jan.kowalski"
const slug = (name) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

// reservations.reserved_by (tekst) -> reservations.user_id (FK do users).
// Migracja działa na bazie z danymi: dla każdej osoby z reserved_by zakładamy konto
// (lub używamy istniejącego o tym samym emailu) i przepinamy na nie rezerwacje.
exports.up = async function (knex) {
  await knex.schema.alterTable("reservations", (table) => {
    table.integer("user_id").references("id").inTable("users").onDelete("RESTRICT");
  });

  const names = await knex("reservations").distinct("reserved_by").pluck("reserved_by");
  for (const name of names) {
    const email = `${slug(name) || "user"}@legacy.roombooking.local`;
    // konto bez znanego hasła (losowy hash) – właściciel musi ustawić hasło na nowo
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
    await knex("users").insert({ email, password_hash: passwordHash, role: "USER" }).onConflict("email").ignore();
    const user = await knex("users").where({ email }).first("id");
    await knex("reservations").where({ reserved_by: name }).update({ user_id: user.id });
  }

  await knex.schema.alterTable("reservations", (table) => {
    table.integer("user_id").notNullable().alter();
    table.index(["user_id"], "reservations_user_id_idx");
    table.dropColumn("reserved_by");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("reservations", (table) => {
    table.string("reserved_by", 100);
  });
  await knex.raw("UPDATE reservations r SET reserved_by = u.email FROM users u WHERE u.id = r.user_id");
  await knex.schema.alterTable("reservations", (table) => {
    table.string("reserved_by", 100).notNullable().alter();
    table.dropIndex(["user_id"], "reservations_user_id_idx");
    table.dropColumn("user_id");
  });
};
