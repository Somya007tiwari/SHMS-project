const Department = require('../models/Department');
const { sendSuccess, sendError, sendCreated } = require('../utils/responseHandler');
const auditService = require('../services/auditService');

const departmentController = {
  async getAll(req, res) {
    const departments = await Department.findAll();
    return sendSuccess(res, departments);
  },

  async getById(req, res) {
    const dept = await Department.findById(req.params.id);
    if (!dept) return sendError(res, 'Department not found', 404);
    return sendSuccess(res, dept);
  },

  async create(req, res) {
    const { name, description, icon } = req.body;
    const dept = await Department.create({ name, description, icon });
    await auditService.log(req, 'create', 'department', dept.id, `Department created: ${name}`);
    return sendCreated(res, dept, 'Department created successfully');
  },

  async update(req, res) {
    const dept = await Department.update(req.params.id, req.body);
    if (!dept) return sendError(res, 'Department not found', 404);
    await auditService.log(req, 'update', 'department', req.params.id, 'Department updated');
    return sendSuccess(res, dept, 'Department updated successfully');
  },

  async delete(req, res) {
    await Department.delete(req.params.id);
    await auditService.log(req, 'delete', 'department', req.params.id, 'Department deactivated');
    return sendSuccess(res, null, 'Department deleted successfully');
  }
};

module.exports = departmentController;
