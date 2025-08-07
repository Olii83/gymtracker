
const pool = require("../utils/db");

const getPersonalRecords = async (req, res) => {
    const userId = req.user.id;

    try {
        const [rows] = await pool.execute(
            "SELECT pr.weight, pr.reps, pr.date, e.name AS exercise_name FROM personal_records pr JOIN exercises e ON pr.exercise_id = e.id WHERE pr.user_id = ? ORDER BY e.name ASC, pr.weight DESC, pr.reps DESC",
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getPersonalRecords };

