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

  async function updateBuilding(id, input) {
    return runInTransaction(async ({ buildings }) => {
      if (!(await buildings.findById(id))) throw new NotFoundError("Building");
      return buildings.update(id, input);
    });
  }

  // budynku z salami nie da się usunąć (FK ON DELETE RESTRICT -> 23503 -> 409)
  async function deleteBuilding(id) {
    return runInTransaction(async ({ buildings }) => {
      if (!(await buildings.delete(id))) throw new NotFoundError("Building");
    });
  }

  async function listRoomsInBuilding(buildingId) {
    return runInTransaction(async ({ buildings, rooms }) => {
      const building = await buildings.findById(buildingId);
      if (!building) throw new NotFoundError("Building");
      return rooms.findByBuilding(buildingId);
    });
  }

  return { listBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding, listRoomsInBuilding };
}

module.exports = { createBuildingsService };
