
const pool = require("../utils/db");

const createExercise = async (req, res) => {
    const { name, weight_type } = req.body;
    const userId = req.user.id;

    if (!name) {
        return res.status(400).json({ message: "Exercise name is required." });
    }

    try {
        const [result] = await pool.execute(
            "INSERT INTO exercises (user_id, name, weight_type) VALUES (?, ?, ?)",
            [userId, name, weight_type]
        );
        res.status(201).json({ id: result.insertId, name, weight_type });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getExercises = async (req, res) => {
    const userId = req.user.id;

    try {
        const [rows] = await pool.execute(
            "SELECT * FROM exercises WHERE user_id = ? ORDER BY name ASC",
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { createExercise, getExercises };

