
const pool = require("../utils/db");
const bcrypt = require("bcrypt");

const getAllUsers = async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT id, username, email, isAdmin, created_at FROM users");
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, email, password, isAdmin } = req.body;

    try {
        let password_hash = null;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            password_hash = await bcrypt.hash(password, salt);
        }

        const [result] = await pool.execute(
            "UPDATE users SET username = ?, email = ?, password_hash = COALESCE(?, password_hash), isAdmin = ? WHERE id = ?",
            [username, email, password_hash, isAdmin, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "User updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.execute("DELETE FROM users WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "User deleted successfully" });
    } catch (error) {
    res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getAllUsers, updateUser, deleteUser };

