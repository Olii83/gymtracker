
const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createExercise, getExercises } = require("../controllers/exerciseController");

const router = express.Router();

router.route("/").post(protect, createExercise).get(protect, getExercises);

module.exports = router;

