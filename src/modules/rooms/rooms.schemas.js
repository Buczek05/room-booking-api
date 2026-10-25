const { z } = require("zod");

const roomIdParams = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

module.exports = { roomIdParams };
