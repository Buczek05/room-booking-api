// Ostatnia linia obrony przed double bookingiem: baza nie dopuści dwóch nakładających się
// rezerwacji CONFIRMED tej samej sali. Przedział półotwarty [start, end) – stykające się są OK.
exports.up = async function (knex) {
  await knex.raw("CREATE EXTENSION IF NOT EXISTS btree_gist");
  await knex.raw(`
    ALTER TABLE reservations ADD CONSTRAINT reservations_no_overlap
    EXCLUDE USING gist (
      room_id WITH =,
      tstzrange(start_time, end_time, '[)') WITH &&
    ) WHERE (status = 'CONFIRMED')
  `);
};

exports.down = async function (knex) {
  await knex.raw("ALTER TABLE reservations DROP CONSTRAINT reservations_no_overlap");
  await knex.raw("DROP EXTENSION IF EXISTS btree_gist");
};
