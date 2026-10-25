const { z } = require("zod");

const registerBody = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string()
    .min(10, "Password must have at least 10 characters")
    .max(72, "Password can have at most 72 characters"), // bcrypt bierze pod uwagę max 72 bajty
}).strict(); // pole role (i każde inne nieznane) -> 400

const loginBody = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
}).strict();

module.exports = { registerBody, loginBody };
