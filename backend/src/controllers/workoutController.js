
const pool = require("../utils/db");

const createWorkout = async (req, res) => {
    const { date, notes, entries } = req.body;
    const userId = req.user.id;

    try {
        await pool.query("START TRANSACTION");

        const [workoutResult] = await pool.execute(
            "INSERT INTO workouts (user_id, date, notes) VALUES (?, ?, ?)",
            [userId, date, notes]
        );
        const workoutId = workoutResult.insertId;

        for (const entry of entries) {
            const [entryResult] = await pool.execute(
                "INSERT INTO workout_entries (workout_id, exercise_id) VALUES (?, ?)",
                [workoutId, entry.exercise_id]
            );
            const entryId = entryResult.insertId;

            for (const set of entry.sets) {
                await pool.execute(
                    "INSERT INTO sets (workout_entry_id, set_number, weight, reps, performance_status, last_weight, last_reps) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [entryId, set.set_number, set.weight, set.reps, set.performance_status, set.last_weight, set.last_reps]
                );
            }
        }

        await pool.query("COMMIT");
        res.status(201).json({ message: "Workout created successfully!", workoutId });
    } catch (error) {
        await pool.query("ROLLBACK");
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getWorkouts = async (req, res) => {
    const userId = req.user.id;

    try {
        const [rows] = await pool.execute(
            "SELECT id, date, notes FROM workouts WHERE user_id = ? ORDER BY date DESC",
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getWorkoutDetails = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const [workoutRows] = await pool.execute("SELECT * FROM workouts WHERE id = ? AND user_id = ?", [id, userId]);
        if (workoutRows.length === 0) {
            return res.status(404).json({ message: "Workout not found" });
        }
        const workout = workoutRows[0];

        const [entries] = await pool.execute(
            "SELECT we.id, e.name, e.weight_type FROM workout_entries we JOIN exercises e ON we.exercise_id = e.id WHERE we.workout_id = ?",
            [id]
        );

        for (const entry of entries) {
            const [sets] = await pool.execute(
                "SELECT set_number, weight, reps, performance_status, last_weight, last_reps FROM sets WHERE workout_entry_id = ?",
                [entry.id]
            );
            entry.sets = sets;
        }

        workout.entries = entries;
        res.json(workout);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { createWorkout, getWorkouts, getWorkoutDetails };

