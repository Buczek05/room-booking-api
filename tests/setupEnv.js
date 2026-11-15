// Uruchamiane przed każdym plikiem testowym, ZANIM moduł config wczyta .env
// (process.loadEnvFile nie nadpisuje zmiennych już ustawionych)
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = require("./testDatabaseUrl");
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.JWT_EXPIRES_IN = "15m";
