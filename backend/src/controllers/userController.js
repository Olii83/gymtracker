
const pool = require("../utils/db");
const bcrypt = require("bcrypt");

const updateProfile = async (req, res) => {
    const userId = req.user.id;
    const { username, email, password } = req.body;

    try {
        let password_hash = null;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            password_hash = await bcrypt.hash(password, salt);
        }

        const [result] = await pool.execute(
            "UPDATE users SET username = ?, email = ?, password_hash = COALESCE(?, password_hash) WHERE id = ?",
            [username, email, password_hash, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "Profile updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { updateProfile };

