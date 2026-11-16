const { NotFoundError, ConflictError, ValidationError, ForbiddenError } = require("../../errors/AppError");
const { noopEventBus } = require("../../events/eventBus");

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

// State machine: dozwolone przejścia statusów
const ALLOWED_TRANSITIONS = {
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [],
};

// Przedziały półotwarte [start, end): stykające się nie nachodzą na siebie
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

const bodyError = (field, message) => new ValidationError([{ location: "body", field, message }]);

// Ownership: właściciel albo ADMIN. Obcy USER dostaje 404 – rezerwacje są prywatne,
// więc nie zdradzamy nawet tego, że rezerwacja o danym ID istnieje.
const canAccess = (reservation, currentUser) =>
  currentUser.role === "ADMIN" || reservation.userId === currentUser.id;

function createReservationsService({ runInTransaction, eventBus = noopEventBus, now = () => new Date() }) {
  async function createReservation(input, currentUser) {
    const start = new Date(input.startTime).getTime();
    const end = new Date(input.endTime).getTime();

    if (end <= start) throw bodyError("endTime", "endTime must be later than startTime");
    const duration = end - start;
    if (duration < MIN_DURATION_MS || duration > MAX_DURATION_MS) {
      throw bodyError("endTime", "Reservation must last between 15 minutes and 8 hours");
    }
    if (start < now().getTime()) throw bodyError("startTime", "startTime cannot be in the past");

    const created = await runInTransaction(async ({ rooms, reservations }) => {
      const room = await rooms.findById(input.roomId);
      if (!room) throw new NotFoundError("Room");

      // blokada wiersza sali do końca transakcji: równoległe rezerwacje tej samej sali
      // czekają tutaj, aż poprzednia transakcja zrobi COMMIT – dopiero wtedy sprawdzają kolizje
      await rooms.lockById(input.roomId);

      if (input.participants > room.capacity) {
        throw new ConflictError("Room capacity exceeded", "ROOM_CAPACITY_EXCEEDED");
      }

      const active = await reservations.findByRoomAndStatus(input.roomId, "CONFIRMED");
      const collision = active.some((r) =>
        overlaps(start, end, new Date(r.startTime).getTime(), new Date(r.endTime).getTime())
      );
      if (collision) {
        throw new ConflictError("Room is already booked in this time range", "ROOM_ALREADY_BOOKED");
      }

      return reservations.create({
        roomId: input.roomId,
        userId: currentUser.id, // tożsamość wyłącznie z tokenu, nigdy z body
        participants: input.participants,
        startTime: new Date(start),
        endTime: new Date(end),
        status: "CONFIRMED",
        createdAt: now(),
      });
    });

    // dopiero po COMMIT – nieudana operacja (wyjątek) nie dochodzi do tej linii
    eventBus.publish("reservation.created", {
      reservationId: created.id,
      roomId: created.roomId,
      userId: created.userId,
      startTime: new Date(created.startTime).toISOString(),
      endTime: new Date(created.endTime).toISOString(),
    });
    return created;
  }

  async function listReservations(query, currentUser) {
    if (currentUser.role !== "ADMIN" && query.userId !== undefined) {
      throw new ForbiddenError("Only ADMIN can filter reservations by userId");
    }
    // USER widzi tylko swoje rezerwacje – filtr dokłada backend, niezależnie od parametrów
    const filters = currentUser.role === "ADMIN" ? query : { ...query, userId: currentUser.id };
    return runInTransaction(async ({ reservations }) => {
      const { items, total } = await reservations.list(filters);
      return {
        items,
        meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      };
    });
  }

  async function getReservation(id, currentUser) {
    return runInTransaction(async ({ reservations }) => {
      const reservation = await reservations.findById(id);
      if (!reservation || !canAccess(reservation, currentUser)) throw new NotFoundError("Reservation");
      return reservation;
    });
  }

  async function cancelReservation(id, currentUser) {
    let changed = false;
    const result = await runInTransaction(async ({ reservations }) => {
      const reservation = await reservations.findById(id);
      if (!reservation || !canAccess(reservation, currentUser)) throw new NotFoundError("Reservation");

      // idempotencja: ponowne anulowanie zwraca rezerwację bez zmian
      if (reservation.status === "CANCELLED") return reservation;

      if (!ALLOWED_TRANSITIONS[reservation.status].includes("CANCELLED")) {
        throw new ConflictError(
          `Cannot change status from ${reservation.status} to CANCELLED`,
          "INVALID_STATUS_TRANSITION"
        );
      }

      if (new Date(reservation.startTime).getTime() <= now().getTime()) {
        throw new ConflictError("Reservation has already started", "RESERVATION_ALREADY_STARTED");
      }

      changed = true;
      return reservations.update(id, { status: "CANCELLED", cancelledAt: now() });
    });

    // event tylko przy faktycznej zmianie (ponowne anulowanie jest idempotentne – bez eventu)
    if (changed) {
      eventBus.publish("reservation.cancelled", {
        reservationId: result.id,
        roomId: result.roomId,
        userId: result.userId,
        cancelledBy: currentUser.id,
      });
    }
    return result;
  }

  return { createReservation, listReservations, getReservation, cancelReservation };
}

module.exports = { createReservationsService, ALLOWED_TRANSITIONS };
