const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");
const { imageUpload, uploadToCloud } = require("../middleware/upload");

// Public route to list doctors
router.get("/", doctorController.getAll);

// Doctor specific /me routes (must come BEFORE /:id to prevent shadowing)
router.get("/me/profile", authenticate, authorize("doctor"), doctorController.getMyProfile);
router.get("/me/dashboard", authenticate, authorize("doctor"), doctorController.getDashboard);
router.get("/me/patients", authenticate, authorize("doctor"), doctorController.getPatients);
router.put("/me/schedule", authenticate, authorize("doctor"), doctorController.updateSchedule);
router.post("/me/leaves", authenticate, authorize("doctor"), doctorController.createLeave);
router.get("/me/leaves", authenticate, authorize("doctor"), doctorController.getMyLeaves);
router.delete("/me/leaves/:id", authenticate, authorize("doctor"), doctorController.deleteLeave);

// Doctor by ID routes
router.get("/:id", doctorController.getById);
router.get("/:id/schedule", doctorController.getSchedule);
router.get("/:id/leaves", doctorController.getDoctorLeaves);

// Public doctor review routes
const reviewController = require("../controllers/reviewController");
const { writeLimiter } = require("../middleware/rateLimiter");
router.get("/:id/reviews", reviewController.getByDoctor);
router.get("/:id/rating-summary", reviewController.getSummary);
router.post("/:id/reviews", authenticate, authorize("patient"), writeLimiter, reviewController.create);

// Admin & Doctor write routes
router.put(
  "/:id",
  authenticate,
  authorize("admin", "doctor"),
  imageUpload.single("profileImage"),
  uploadToCloud("shms/profiles"),
  doctorController.update
);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  imageUpload.single("profileImage"),
  uploadToCloud("shms/profiles"),
  doctorController.create
);

module.exports = router;
