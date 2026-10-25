const { z } = require("zod");

const roomIdParams = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

const createRoomBody = z.object({
  buildingId: z.number().int().positive(),
  name: z.string().trim().min(1).max(50),
  capacity: z.number().int().positive(),
}).strict();

const updateRoomBody = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  capacity: z.number().int().positive().optional(),
}).strict().refine((b) => Object.keys(b).length > 0, { message: "At least one field is required" });

module.exports = { roomIdParams, createRoomBody, updateRoomBody };
