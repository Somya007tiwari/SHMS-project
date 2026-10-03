const express = require('express');
const router = express.Router();
const aiAssistantController = require('../controllers/aiAssistantController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { analyzeSymptomsSchema } = require('../validators');

router.get('/welcome', aiAssistantController.getWelcome);
router.post('/analyze', authenticate, authorize('patient'), validate(analyzeSymptomsSchema), aiAssistantController.analyze);

module.exports = router;
