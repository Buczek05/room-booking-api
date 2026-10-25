const { z } = require("zod");

const SORT_VALUES = ["startTime", "-startTime", "createdAt", "-createdAt", "participants", "-participants"];

const reservationIdParams = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

const createReservationBody = z.object({
  roomId: z.number().int().positive(),
  participants: z.number().int().positive(),
  startTime: z.iso.datetime({ offset: true }),
  endTime: z.iso.datetime({ offset: true }),
}).strict();

const listReservationsQuery = z.object({
  roomId: z.coerce.number().int().positive().optional(),
  buildingId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  status: z.enum(["CONFIRMED", "CANCELLED"]).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(SORT_VALUES).default("startTime"),
}).strict().refine(
  (q) => q.from === undefined || q.to === undefined || new Date(q.from).getTime() < new Date(q.to).getTime(),
  { path: ["from"], message: "from must be earlier than to" }
);

module.exports = { reservationIdParams, createReservationBody, listReservationsQuery };
