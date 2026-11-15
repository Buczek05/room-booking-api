// Symulacja powiadomienia: ADMIN anulował cudzą rezerwację -> "wysyłamy" info do właściciela
function registerNotificationListeners(eventBus, { runInTransaction, logger = console }) {
  eventBus.subscribe("reservation.cancelled", async ({ payload }) => {
    if (payload.cancelledBy === payload.userId) return; // właściciel anulował sam
    const owner = await runInTransaction(({ users }) => users.findById(payload.userId));
    logger.log(
      `[notification] to: ${owner.email} – Twoja rezerwacja #${payload.reservationId} (sala ${payload.roomId}) ` +
      `została anulowana przez administratora (user #${payload.cancelledBy})`
    );
  });
}

module.exports = { registerNotificationListeners };
