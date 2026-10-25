const knex = require("knex");
const config = require("../../knexfile");

// Jedna pula połączeń na całą aplikację
module.exports = knex(config);
