const request = require("supertest");
const config = require("../../src/config");
const db = require("../../src/db/knex");
const { createApp } = require("../../src/app");
const { createKnexUnitOfWork } = require("../../src/db/unitOfWork.knex");

// createApp() bez app.listen – supertest wysyła requesty bezpośrednio do aplikacji
const app = createApp({ config, runInTransaction: createKnexUnitOfWork(db).runInTransaction });

const PASSWORD = "bardzo-dlugie-haslo";

async function registerAndLogin(email) {
  await request(app).post("/api/auth/register").send({ email, password: PASSWORD }).expect(201);
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
  return res.body.accessToken;
}

async function loginAsAdmin() {
  // ADMIN nie da się utworzyć przez API – tworzymy go bezpośrednio w bazie (jak seed)
  const bcrypt = require("bcryptjs");
  await db("users").insert({ email: "admin@example.com", password_hash: await bcrypt.hash(PASSWORD, 10), role: "ADMIN" });
  const res = await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: PASSWORD }).expect(200);
  return res.body.accessToken;
}

const reservationBody = (overrides = {}) => ({
  roomId: 1,
  participants: 10,
  startTime: "2030-01-10T10:00:00Z",
  endTime: "2030-01-10T12:00:00Z",
  ...overrides,
});

beforeAll(async () => {
  await db.migrate.latest(); // schemat bazy testowej zawsze z migracji
});

beforeEach(async () => {
  // każdy test zaczyna od czystego, znanego stanu
  await db.raw("TRUNCATE audit_log, reservations, rooms, buildings, users RESTART IDENTITY CASCADE");
  await db("buildings").insert({ name: "Budynek A", address: "ul. Testowa 1" });
  await db("rooms").insert([
    { building_id: 1, name: "101", capacity: 30 },
    { building_id: 1, name: "102", capacity: 20 },
  ]);
});

afterAll(async () => {
  await db.destroy(); // zamknięcie puli – brak "open handles"
});

describe("Auth", () => {
  test("rejestracja + logowanie + GET /api/auth/me", async () => {
    const token = await registerAndLogin("Jan.Kowalski@Example.com");
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, email: "jan.kowalski@example.com", role: "USER" });
    expect(res.body).not.toHaveProperty("passwordHash");
  });

  test("401 bez tokenu", async () => {
    const res = await request(app).get("/api/reservations");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("Reservations API", () => {
  test("POST /api/reservations -> 201, Location i rekord w bazie", async () => {
    const token = await registerAndLogin("jan@example.com");
    const res = await request(app).post("/api/reservations").set("Authorization", `Bearer ${token}`).send(reservationBody());

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/reservations/${res.body.id}`);
    expect(res.body.user).toEqual({ id: 1, email: "jan@example.com" });

    const row = await db("reservations").where({ id: res.body.id }).first();
    expect(row).toMatchObject({ room_id: 1, user_id: 1, participants: 10, status: "CONFIRMED" });
  });

  test("400 z poprawnymi details dla błędnego body", async () => {
    const token = await registerAndLogin("jan@example.com");
    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({ roomId: "1", participants: 0, startTime: "jutro", userId: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ location: "body", field: "roomId" }),
      expect.objectContaining({ location: "body", field: "participants" }),
      expect.objectContaining({ location: "body", field: "startTime" }),
      expect.objectContaining({ location: "body", field: "endTime" }),
      expect.objectContaining({ location: "body", field: "userId" }),
    ]));
  });

  test("409 ROOM_ALREADY_BOOKED dla nakładającej się rezerwacji", async () => {
    const token = await registerAndLogin("jan@example.com");
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post("/api/reservations").set(auth).send(reservationBody()).expect(201);
    const res = await request(app).post("/api/reservations").set(auth)
      .send(reservationBody({ startTime: "2030-01-10T11:00:00Z", endTime: "2030-01-10T13:00:00Z" }));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ROOM_ALREADY_BOOKED");
    expect(await db("reservations").count({ n: "*" }).first()).toEqual({ n: "1" });
  });

  test("404 dla USER pobierającego cudzą rezerwację", async () => {
    const janToken = await registerAndLogin("jan@example.com");
    const annaToken = await registerAndLogin("anna@example.com");
    const { body: created } = await request(app).post("/api/reservations")
      .set("Authorization", `Bearer ${janToken}`).send(reservationBody()).expect(201);

    const res = await request(app).get(`/api/reservations/${created.id}`).set("Authorization", `Bearer ${annaToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("pagination: meta.total i liczba elementów przy limit mniejszym niż liczba rekordów", async () => {
    const token = await registerAndLogin("jan@example.com");
    const auth = { Authorization: `Bearer ${token}` };
    for (let day = 10; day < 15; day++) {
      await request(app).post("/api/reservations").set(auth)
        .send(reservationBody({ startTime: `2030-01-${day}T10:00:00Z`, endTime: `2030-01-${day}T11:00:00Z` })).expect(201);
    }

    const res = await request(app).get("/api/reservations?limit=2&page=2&sort=startTime").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(res.body.data.map((r) => r.startTime.slice(0, 10))).toEqual(["2030-01-12", "2030-01-13"]);
  });
});

describe("Authorization", () => {
  test("403 dla USER próbującego utworzyć salę", async () => {
    const token = await registerAndLogin("jan@example.com");
    const res = await request(app).post("/api/rooms").set("Authorization", `Bearer ${token}`)
      .send({ buildingId: 1, name: "301", capacity: 10 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(await db("rooms").where({ name: "301" }).first()).toBeUndefined();
  });

  test("ADMIN tworzy salę (201), a GET /api/admin/audit-log jest tylko dla ADMIN", async () => {
    const adminToken = await loginAsAdmin();
    const userToken = await registerAndLogin("jan@example.com");

    await request(app).post("/api/rooms").set("Authorization", `Bearer ${adminToken}`)
      .send({ buildingId: 1, name: "301", capacity: 10 }).expect(201);
    await request(app).get("/api/admin/audit-log").set("Authorization", `Bearer ${userToken}`).expect(403);
    const res = await request(app).get("/api/admin/audit-log").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });
});
