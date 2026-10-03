const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Patient family / dependent management routes
router.get('/', authenticate, authorize('patient'), familyController.getMyDependents);
router.post('/', authenticate, authorize('patient'), familyController.createDependent);
router.put('/:id', authenticate, authorize('patient'), familyController.updateDependent);
router.delete('/:id', authenticate, authorize('patient'), familyController.deactivateDependent);

module.exports = router;
