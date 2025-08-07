
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const exerciseRoutes = require("./routes/exerciseRoutes");
const workoutRoutes = require("./routes/workoutRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

