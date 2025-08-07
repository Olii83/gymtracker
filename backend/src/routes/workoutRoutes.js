
const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createWorkout, getWorkouts, getWorkoutDetails } = require("../controllers/workoutController");

const router = express.Router();

router.post("/", protect, createWorkout);
router.get("/", protect, getWorkouts);
router.get("/:id", protect, getWorkoutDetails);

module.exports = router;

