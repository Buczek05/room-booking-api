const { NotFoundError } = require("../../errors/AppError");

function createRoomsService({ runInTransaction }) {
  async function listRooms() {
    return runInTransaction(({ rooms }) => rooms.findAll());
  }

  async function getRoom(id) {
    return runInTransaction(async ({ rooms }) => {
      const room = await rooms.findById(id);
      if (!room) throw new NotFoundError("Room");
      return room;
    });
  }

  // duplikat nazwy sali w budynku pilnuje UNIQUE (building_id, name) w bazie -> 23505 -> 409
  async function createRoom(input) {
    return runInTransaction(async ({ buildings, rooms }) => {
      const building = await buildings.findById(input.buildingId);
      if (!building) throw new NotFoundError("Building");
      return rooms.create(input);
    });
  }

  async function updateRoom(id, input) {
    return runInTransaction(async ({ rooms }) => {
      if (!(await rooms.findById(id))) throw new NotFoundError("Room");
      return rooms.update(id, input);
    });
  }

  // sali z rezerwacjami nie da się usunąć (FK ON DELETE RESTRICT -> 23503 -> 409)
  async function deleteRoom(id) {
    return runInTransaction(async ({ rooms }) => {
      if (!(await rooms.delete(id))) throw new NotFoundError("Room");
    });
  }

  return { listRooms, getRoom, createRoom, updateRoom, deleteRoom };
}

module.exports = { createRoomsService };
