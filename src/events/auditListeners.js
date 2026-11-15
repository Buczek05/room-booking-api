// Listener zapisujący każdy event rezerwacji do tabeli audit_log
const AUDITED_EVENTS = ["reservation.created", "reservation.cancelled"];

function registerAuditListeners(eventBus, { runInTransaction }) {
  const save = (event) =>
    runInTransaction(({ auditLog }) =>
      auditLog.create({ eventType: event.name, payload: event.payload, createdAt: event.occurredAt }));
  for (const name of AUDITED_EVENTS) eventBus.subscribe(name, save);
}

module.exports = { registerAuditListeners, AUDITED_EVENTS };
