const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");

router.use(authenticate);

router.put("/:id", authorize("patient"), reviewController.update);
router.delete("/:id", authorize("patient", "admin"), reviewController.delete);

module.exports = router;
