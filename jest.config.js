module.exports = {
  projects: [
    {
      // unit: service + repositories in-memory + zamrożony czas – bez bazy danych
      displayName: "unit",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/unit/**/*.test.js"],
    },
    {
      // integration: supertest -> Express -> service -> PostgreSQL (osobna baza *_test)
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/integration/**/*.test.js"],
      setupFiles: ["<rootDir>/tests/setupEnv.js"],
      globalSetup: "<rootDir>/tests/globalSetup.js",
    },
  ],
};
