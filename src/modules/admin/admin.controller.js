const { toAuditLogResponse } = require("./admin.mapper");

function createAdminController(adminService) {
  return {
    async auditLog(req, res) {
      const { items, meta } = await adminService.listAuditLog(req.validated.query);
      res.json({ data: items.map(toAuditLogResponse), meta });
    },
  };
}

module.exports = { createAdminController };
