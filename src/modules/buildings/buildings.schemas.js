const { z } = require("zod");

const buildingIdParams = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

const createBuildingBody = z.object({
  name: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(200),
}).strict();

module.exports = { buildingIdParams, createBuildingBody };
