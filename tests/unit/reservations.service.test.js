const { createReservationsService } = require("../../src/modules/reservations/reservations.service");
const { createInMemoryUnitOfWork } = require("../../src/db/unitOfWork.memory");

// Zamrożony "teraz" – testy dają ten sam wynik dziś i za rok
const NOW = new Date("2026-11-01T12:00:00Z");

const owner = { id: 2, role: "USER" };
const stranger = { id: 3, role: "USER" };
const admin = { id: 1, role: "ADMIN" };

const reservation = (id, overrides = {}) => ({
  id,
  roomId: 1,
  userId: owner.id,
  participants: 10,
  startTime: new Date("2026-11-10T10:00:00Z"),
  endTime: new Date("2026-11-10T12:00:00Z"),
  status: "CONFIRMED",
  createdAt: NOW,
  cancelledAt: null,
  ...overrides,
});

// Każdy test buduje własny, świeży stan – testy nie zależą od kolejności
function setup({ reservations = [reservation(1)], now = () => NOW } = {}) {
  const { runInTransaction, repositories } = createInMemoryUnitOfWork({
    users: [
      { id: 1, email: "admin@example.com", role: "ADMIN" },
      { id: 2, email: "owner@example.com", role: "USER" },
      { id: 3, email: "stranger@example.com", role: "USER" },
    ],
    buildings: [{ id: 1, name: "Budynek A", address: "ul. Testowa 1" }],
    rooms: [
      { id: 1, buildingId: 1, name: "101", capacity: 30 },
      { id: 2, buildingId: 1, name: "102", capacity: 30 },
    ],
    reservations,
    auditLog: [],
  });
  const eventBus = { publish: jest.fn(), subscribe: jest.fn() };
  const service = createReservationsService({ runInTransaction, eventBus, now });
  return { service, eventBus, repositories };
}

const input = (start, end, overrides = {}) => ({
  roomId: 1,
  participants: 10,
  startTime: `2026-11-10T${start}:00Z`,
  endTime: `2026-11-10T${end}:00Z`,
  ...overrides,
});

describe("createReservation – nakładanie się (istniejąca: sala 1, 10:00–12:00)", () => {
  test.each([
    ["częściowo na koniec", "11:00", "13:00"],
    ["częściowo na początek", "09:00", "11:00"],
    ["zawiera istniejącą", "09:00", "13:00"],
    ["zawiera się w istniejącej", "10:30", "11:00"],
    ["identyczny przedział", "10:00", "12:00"],
  ])("odrzuca nakładającą się rezerwację: %s (%s–%s)", async (_, start, end) => {
    const { service } = setup();
    await expect(service.createReservation(input(start, end), owner))
      .rejects.toMatchObject({ statusCode: 409, code: "ROOM_ALREADY_BOOKED" });
  });

  test.each([
    ["styka się od końca", "12:00", "13:00"],
    ["styka się od początku", "08:00", "10:00"],
  ])("pozwala na rezerwację, która tylko się styka: %s (%s–%s)", async (_, start, end) => {
    const { service } = setup();
    await expect(service.createReservation(input(start, end), owner))
      .resolves.toMatchObject({ status: "CONFIRMED" });
  });

  test("pozwala na ten sam przedział w innej sali", async () => {
    const { service } = setup();
    await expect(service.createReservation(input("10:00", "12:00", { roomId: 2 }), owner))
      .resolves.toMatchObject({ roomId: 2, status: "CONFIRMED" });
  });

  test("anulowana rezerwacja nie blokuje przedziału", async () => {
    const { service } = setup({ reservations: [reservation(1, { status: "CANCELLED", cancelledAt: NOW })] });
    await expect(service.createReservation(input("10:00", "12:00"), owner))
      .resolves.toMatchObject({ status: "CONFIRMED" });
  });
});

describe("createReservation – pojemność i czas trwania", () => {
  test("participants == capacity jest dozwolone", async () => {
    const { service } = setup({ reservations: [] });
    await expect(service.createReservation(input("10:00", "11:00", { participants: 30 }), owner))
      .resolves.toMatchObject({ participants: 30 });
  });

  test("capacity + 1 jest odrzucone", async () => {
    const { service } = setup({ reservations: [] });
    await expect(service.createReservation(input("10:00", "11:00", { participants: 31 }), owner))
      .rejects.toMatchObject({ statusCode: 409, code: "ROOM_CAPACITY_EXCEEDED" });
  });

  test.each([
    ["dokładnie 15 min", "14:00", "14:15"],
    ["dokładnie 8 h", "13:00", "21:00"],
  ])("czas trwania %s jest dozwolony", async (_, start, end) => {
    const { service } = setup({ reservations: [] });
    await expect(service.createReservation(input(start, end), owner)).resolves.toMatchObject({ status: "CONFIRMED" });
  });

  test.each([
    ["14 min", "14:00", "14:14"],
    ["8 h 1 min", "13:00", "21:01"],
  ])("czas trwania %s jest odrzucony", async (_, start, end) => {
    const { service } = setup({ reservations: [] });
    await expect(service.createReservation(input(start, end), owner))
      .rejects.toMatchObject({ statusCode: 400, code: "VALIDATION_ERROR" });
  });

  test("start w przeszłości jest odrzucony", async () => {
    const { service } = setup({ reservations: [] });
    await expect(service.createReservation({ ...input("10:00", "11:00"), startTime: "2026-10-01T10:00:00Z", endTime: "2026-10-01T11:00:00Z" }, owner))
      .rejects.toMatchObject({ statusCode: 400, code: "VALIDATION_ERROR" });
  });
});

describe("cancelReservation", () => {
  test("rozpoczętej rezerwacji nie można anulować", async () => {
    const started = reservation(1, { startTime: new Date("2026-11-01T11:00:00Z"), endTime: new Date("2026-11-01T13:00:00Z") });
    const { service } = setup({ reservations: [started] });
    await expect(service.cancelReservation(1, owner))
      .rejects.toMatchObject({ statusCode: 409, code: "RESERVATION_ALREADY_STARTED" });
  });

  test("podwójne anulowanie jest idempotentne – cancelledAt się nie zmienia", async () => {
    let clock = NOW;
    const { service } = setup({ now: () => clock });
    const first = await service.cancelReservation(1, owner);
    clock = new Date("2026-11-01T15:00:00Z"); // czas mija między wywołaniami
    const second = await service.cancelReservation(1, owner);
    expect(first.status).toBe("CANCELLED");
    expect(second.status).toBe("CANCELLED");
    expect(second.cancelledAt).toEqual(first.cancelledAt);
    expect(first.cancelledAt).toEqual(NOW);
  });
});

describe("ownership", () => {
  test("obcy USER nie może pobrać ani anulować cudzej rezerwacji (404)", async () => {
    const { service, repositories } = setup();
    await expect(service.getReservation(1, stranger)).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
    await expect(service.cancelReservation(1, stranger)).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
    expect((await repositories.reservations.findById(1)).status).toBe("CONFIRMED");
  });

  test("ADMIN może anulować cudzą rezerwację", async () => {
    const { service } = setup();
    await expect(service.cancelReservation(1, admin)).resolves.toMatchObject({ status: "CANCELLED" });
  });

  test("USER widzi na liście tylko swoje rezerwacje, a filtr userId dostaje 403", async () => {
    const { service } = setup({ reservations: [reservation(1), reservation(2, { userId: stranger.id, roomId: 2 })] });
    const { items } = await service.listReservations({ page: 1, limit: 20, sort: "startTime" }, owner);
    expect(items.map((r) => r.id)).toEqual([1]);
    await expect(service.listReservations({ page: 1, limit: 20, sort: "startTime", userId: 3 }, owner))
      .rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
  });
});

describe("eventy", () => {
  test("po udanym utworzeniu publikuje reservation.created", async () => {
    const { service, eventBus } = setup();
    const created = await service.createReservation(input("12:00", "13:00"), owner);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith("reservation.created", {
      reservationId: created.id,
      roomId: 1,
      userId: owner.id,
      startTime: "2026-11-10T12:00:00.000Z",
      endTime: "2026-11-10T13:00:00.000Z",
    });
  });

  test("nieudana operacja (409) nie publikuje eventu", async () => {
    const { service, eventBus } = setup();
    await expect(service.createReservation(input("11:00", "13:00"), owner)).rejects.toMatchObject({ code: "ROOM_ALREADY_BOOKED" });
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  test("anulowanie publikuje reservation.cancelled raz – ponowne anulowanie już nie", async () => {
    const { service, eventBus } = setup();
    await service.cancelReservation(1, admin);
    await service.cancelReservation(1, admin);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith("reservation.cancelled", {
      reservationId: 1, roomId: 1, userId: owner.id, cancelledBy: admin.id,
    });
  });
});
