const { NotFoundError } = require("../../errors/AppError");

function createBuildingsService({ runInTransaction }) {
  async function listBuildings() {
    return runInTransaction(({ buildings }) => buildings.findAll());
  }

  async function getBuilding(id) {
    return runInTransaction(async ({ buildings }) => {
      const building = await buildings.findById(id);
      if (!building) throw new NotFoundError("Building");
      return building;
    });
  }

  // nazwa budynku jest UNIQUE w bazie – duplikat kończy się 409 z error handlera
  async function createBuilding(input) {
    return runInTransaction(({ buildings }) => buildings.create(input));
  }

  async function listRoomsInBuilding(buildingId) {
    return runInTransaction(async ({ buildings, rooms }) => {
      const building = await buildings.findById(buildingId);
      if (!building) throw new NotFoundError("Building");
      return rooms.findByBuilding(buildingId);
    });
  }

  return { listBuildings, getBuilding, createBuilding, listRoomsInBuilding };
}

module.exports = { createBuildingsService };
