const { NotFoundError, ConflictError, ValidationError } = require("../../errors/AppError");

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

function createReservationsService({ runInTransaction, now = () => new Date() }) {
  async function createReservation(input) {
    const start = new Date(input.startTime).getTime();
    const end = new Date(input.endTime).getTime();

    if (end <= start) throw bodyError("endTime", "endTime must be later than startTime");
    const duration = end - start;
    if (duration < MIN_DURATION_MS || duration > MAX_DURATION_MS) {
      throw bodyError("endTime", "Reservation must last between 15 minutes and 8 hours");
    }
    if (start < now().getTime()) throw bodyError("startTime", "startTime cannot be in the past");

    return runInTransaction(async ({ rooms, reservations }) => {
      const room = await rooms.findById(input.roomId);
      if (!room) throw new NotFoundError("Room");

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
        reservedBy: input.reservedBy,
        participants: input.participants,
        startTime: new Date(start),
        endTime: new Date(end),
        status: "CONFIRMED",
        createdAt: now(),
      });
    });
  }

  async function listReservations(query) {
    return runInTransaction(async ({ reservations }) => {
      const { items, total } = await reservations.list(query);
      return {
        items,
        meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      };
    });
  }

  async function getReservation(id) {
    return runInTransaction(async ({ reservations }) => {
      const reservation = await reservations.findById(id);
      if (!reservation) throw new NotFoundError("Reservation");
      return reservation;
    });
  }

  async function cancelReservation(id) {
    return runInTransaction(async ({ reservations }) => {
      const reservation = await reservations.findById(id);
      if (!reservation) throw new NotFoundError("Reservation");

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

      return reservations.update(id, { status: "CANCELLED", cancelledAt: now() });
    });
  }

  return { createReservation, listReservations, getReservation, cancelReservation };
}

module.exports = { createReservationsService, ALLOWED_TRANSITIONS };
