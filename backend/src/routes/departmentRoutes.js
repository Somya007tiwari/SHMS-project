const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', departmentController.getAll);
router.get('/:id', departmentController.getById);

router.use(authenticate);
router.post('/', authorize('admin'), departmentController.create);
router.put('/:id', authorize('admin'), departmentController.update);
router.delete('/:id', authorize('admin'), departmentController.delete);

module.exports = router;
