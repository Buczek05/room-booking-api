// Adres bazy testowej: TEST_DATABASE_URL (CI / .env) – nigdy baza deweloperska
try {
  process.loadEnvFile();
} catch {
  // brak .env – np. w CI zmienne przychodzą z workflow
}

const url = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/roombooking_test";
if (!new URL(url).pathname.endsWith("_test")) {
  throw new Error(`Refusing to run tests on "${url}" – test database name must end with _test`);
}

module.exports = url;
