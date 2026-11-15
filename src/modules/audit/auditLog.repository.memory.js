// Implementacja in-memory – ten sam interfejs co auditLog.repository.knex.js
function createInMemoryAuditLogRepository(state) {
  let nextId = Math.max(0, ...state.auditLog.map((e) => e.id)) + 1;
  return {
    async create({ eventType, payload, createdAt }) {
      const entry = { id: nextId++, eventType, payload, createdAt: new Date(createdAt ?? Date.now()) };
      state.auditLog.push(entry);
      return entry;
    },
    async list({ eventType, page = 1, limit = 20 } = {}) {
      const matching = state.auditLog
        .filter((e) => eventType === undefined || e.eventType === eventType)
        .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
      return { items: matching.slice((page - 1) * limit, page * limit), total: matching.length };
    },
  };
}

module.exports = { createInMemoryAuditLogRepository };
