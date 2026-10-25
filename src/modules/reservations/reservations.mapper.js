const toIso = (value) => (value ? new Date(value).toISOString() : null);

// Whitelist pól – internalNote nigdy nie trafia do odpowiedzi
function toReservationResponse(reservation) {
  return {
    id: reservation.id,
    roomId: reservation.roomId,
    reservedBy: reservation.reservedBy,
    participants: reservation.participants,
    startTime: toIso(reservation.startTime),
    endTime: toIso(reservation.endTime),
    status: reservation.status,
    createdAt: toIso(reservation.createdAt),
    cancelledAt: toIso(reservation.cancelledAt),
  };
}

module.exports = { toReservationResponse };
