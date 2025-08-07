
const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { protectAdmin } = require("../middleware/adminMiddleware");
const { getAllUsers, updateUser, deleteUser } = require("../controllers/adminController");

const router = express.Router();

router.use(protect, protectAdmin);

router.route("/users").get(getAllUsers);
router.route("/users/:id").put(updateUser).delete(deleteUser);

module.exports = router;

