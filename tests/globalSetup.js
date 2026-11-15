const { Client } = require("pg");
const testDatabaseUrl = require("./testDatabaseUrl");

// Tworzy pustą bazę testową, jeżeli jeszcze nie istnieje – npm test działa "od zera".
// Schemat tworzą migracje w beforeAll testów integracyjnych.
module.exports = async function globalSetup() {
  const url = new URL(testDatabaseUrl);
  const dbName = url.pathname.slice(1);
  url.pathname = "/postgres";
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (rowCount === 0) await client.query(`CREATE DATABASE "${dbName}"`);
  await client.end();
};
