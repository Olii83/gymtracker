
const pool = require("../utils/db");

const protectAdmin = async (req, res, next) => {
    try {
        const [rows] = await pool.execute("SELECT isAdmin FROM users WHERE id = ?", [req.user.id]);
        const user = rows[0];

        if (user && user.isAdmin) {
            next();
        } else {
            res.status(403).json({ message: "Not authorized as an admin" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { protectAdmin };

