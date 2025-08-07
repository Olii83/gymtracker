
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../utils/db");

const registerUser = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const [result] = await pool.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            [username, email, password_hash]
        );

        const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.status(201).json({
            id: result.insertId,
            username,
            email,
            token,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
        const user = rows[0];

        if (user && (await bcrypt.compare(password, user.password_hash))) {
            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });

            res.json({
                id: user.id,
                username: user.username,
                email: user.email,
                token,
            });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const [userRows] = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);
        const user = userRows[0];

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const token = crypto.randomBytes(20).toString("hex");
        const expiresAt = new Date(Date.now() + 3600000);

        await pool.execute(
            "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, expires_at = ?",
            [user.id, token, expiresAt, token, expiresAt]
        );

        console.log(`Password reset token for ${email}: ${token}`);

        res.json({ message: "Password reset link has been sent to your email." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    try {
        const [tokenRows] = await pool.execute(
            "SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()",
            [token]
        );
        const tokenEntry = tokenRows[0];

        if (!tokenEntry) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [password_hash, tokenEntry.user_id]);
        await pool.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", [tokenEntry.user_id]);

        res.json({ message: "Password has been reset successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { registerUser, loginUser, forgotPassword, resetPassword };

