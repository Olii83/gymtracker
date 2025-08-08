const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'gym_tracker',
    password: process.env.DB_PASSWORD || 'gym_tracker_password',
    database: process.env.DB_NAME || 'gym_tracker',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Email configuration
let transporter = null;

async function initializeEmailTransporter() {
    try {
        const settings = await getSettings();
        if (settings.smtp_host && settings.smtp_username && settings.smtp_password) {
            transporter = nodemailer.createTransporter({
                host: settings.smtp_host,
                port: parseInt(settings.smtp_port) || 587,
                secure: settings.smtp_encryption === 'ssl',
                auth: {
                    user: settings.smtp_username,
                    pass: settings.smtp_password
                }
            });
        }
    } catch (error) {
        console.error('Failed to initialize email transporter:', error);
    }
}

// Helper functions
async function getSettings() {
    try {
        const [rows] = await pool.execute('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        return settings;
    } catch (error) {
        console.error('Error getting settings:', error);
        return {};
    }
}

async function sendEmail(to, subject, html) {
    if (!transporter) return false;
    
    try {
        const settings = await getSettings();
        await transporter.sendMail({
            from: `${settings.from_name || 'Gym Tracker'} <${settings.from_email || 'noreply@gym.zhst.eu'}>`,
            to,
            subject,
            html
        });
        return true;
    } catch (error) {
        console.error('Email sending failed:', error);
        return false;
    }
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function hashPassword(password) {
    return await bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// Middleware for authentication
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE id = ? AND is_active = 1',
            [decoded.userId]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        req.user = rows[0];
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
}

// Admin authentication middleware
async function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [rows] = await pool.execute(
            'SELECT * FROM admin_users WHERE id = ? AND is_active = 1',
            [decoded.adminId]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid admin token' });
        }
        
        req.admin = rows[0];
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid admin token' });
    }
}

// Routes

// Auth routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, firstName, lastName } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User with this email or username already exists' });
        }

        const passwordHash = await hashPassword(password);
        
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
            [username, email, passwordHash, firstName || null, lastName || null]
        );

        const token = jwt.sign({ userId: result.insertId }, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: result.insertId,
                username,
                email,
                firstName: firstName || null,
                lastName: lastName || null
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE email = ? AND is_active = 1',
            [email]
        );

        if (rows.length === 0 || !(await verifyPassword(password, rows[0].password_hash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const [rows] = await pool.execute(
            'SELECT id, username FROM users WHERE email = ? AND is_active = 1',
            [email]
        );

        if (rows.length === 0) {
            return res.json({ message: 'If the email exists, a reset link has been sent' });
        }

        const user = rows[0];
        const resetToken = generateToken();
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await pool.execute(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, resetToken, expiresAt]
        );

        const settings = await getSettings();
        const resetLink = `${settings.site_url || 'https://gym.zhst.eu'}/reset-password.html?token=${resetToken}`;
        
        await sendEmail(
            email,
            'Password Reset Request',
            `
            <h2>Password Reset Request</h2>
            <p>Hello ${user.username},</p>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <a href="${resetLink}">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            `
        );

        res.json({ message: 'If the email exists, a reset link has been sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password are required' });
        }

        const [rows] = await pool.execute(
            'SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > NOW() AND used = 0',
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const userId = rows[0].user_id;
        const passwordHash = await hashPassword(password);

        await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
        await pool.execute('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', [token]);

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User profile routes
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        res.json({
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            firstName: req.user.first_name,
            lastName: req.user.last_name
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { username, email, firstName, lastName, currentPassword, newPassword } = req.body;

        // Check if username or email already exists (excluding current user)
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
            [username, email, req.user.id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Username or email already taken' });
        }

        // If changing password, verify current password
        if (newPassword) {
            if (!currentPassword || !(await verifyPassword(currentPassword, req.user.password_hash))) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
            const passwordHash = await hashPassword(newPassword);
            await pool.execute(
                'UPDATE users SET username = ?, email = ?, first_name = ?, last_name = ?, password_hash = ? WHERE id = ?',
                [username, email, firstName || null, lastName || null, passwordHash, req.user.id]
            );
        } else {
            await pool.execute(
                'UPDATE users SET username = ?, email = ?, first_name = ?, last_name = ? WHERE id = ?',
                [username, email, firstName || null, lastName || null, req.user.id]
            );
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Exercise routes
app.get('/api/exercises', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT e.*, c.name as category_name 
            FROM exercises e 
            LEFT JOIN exercise_categories c ON e.category_id = c.id 
            WHERE e.user_id = ? OR e.is_public = 1 
            ORDER BY e.name
        `, [req.user.id]);

        res.json(rows);
    } catch (error) {
        console.error('Get exercises error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/exercises', authenticateToken, async (req, res) => {
    try {
        const { name, description, categoryId, weightType } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Exercise name is required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO exercises (user_id, name, description, category_id, weight_type) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, name, description || null, categoryId || null, weightType || 'kg']
        );

        res.status(201).json({
            id: result.insertId,
            message: 'Exercise created successfully'
        });
    } catch (error) {
        console.error('Create exercise error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get exercise categories
app.get('/api/exercise-categories', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM exercise_categories ORDER BY name');
        res.json(rows);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Workout routes
app.get('/api/workouts', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT w.*, 
                COUNT(we.id) as exercise_count
            FROM workouts w
            LEFT JOIN workout_exercises we ON w.id = we.workout_id
            WHERE w.user_id = ?
            GROUP BY w.id
            ORDER BY w.created_at DESC
        `, [req.user.id]);

        res.json(rows);
    } catch (error) {
        console.error('Get workouts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/workouts/:id', authenticateToken, async (req, res) => {
    try {
        const [workoutRows] = await pool.execute(
            'SELECT * FROM workouts WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (workoutRows.length === 0) {
            return res.status(404).json({ error: 'Workout not found' });
        }

        const [exerciseRows] = await pool.execute(`
            SELECT we.*, e.name as exercise_name, e.weight_type
            FROM workout_exercises we
            JOIN exercises e ON we.exercise_id = e.id
            WHERE we.workout_id = ?
            ORDER BY we.order_index
        `, [req.params.id]);

        res.json({
            ...workoutRows[0],
            exercises: exerciseRows
        });
    } catch (error) {
        console.error('Get workout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/workouts', authenticateToken, async (req, res) => {
    try {
        const { name, description, exercises, isTemplate } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Workout name is required' });
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [workoutResult] = await connection.execute(
                'INSERT INTO workouts (user_id, name, description, is_template) VALUES (?, ?, ?, ?)',
                [req.user.id, name, description || null, isTemplate || false]
            );

            const workoutId = workoutResult.insertId;

            if (exercises && exercises.length > 0) {
                for (let i = 0; i < exercises.length; i++) {
                    const exercise = exercises[i];
                    await connection.execute(
                        'INSERT INTO workout_exercises (workout_id, exercise_id, order_index, target_sets, target_reps, target_weight, rest_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [workoutId, exercise.exerciseId, i, exercise.targetSets || 3, exercise.targetReps || 10, exercise.targetWeight || 0, exercise.restTime || 120]
                    );
                }
            }

            await connection.commit();
            res.status(201).json({
                id: workoutId,
                message: 'Workout created successfully'
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Create workout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Workout session routes
app.get('/api/sessions', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const [rows] = await pool.execute(`
            SELECT ws.*, 
                COUNT(DISTINCT se.id) as exercise_count,
                COUNT(s.id) as total_sets
            FROM workout_sessions ws
            LEFT JOIN session_exercises se ON ws.id = se.session_id
            LEFT JOIN sets s ON se.id = s.session_exercise_id
            WHERE ws.user_id = ?
            GROUP BY ws.id
            ORDER BY ws.start_time DESC
            LIMIT ? OFFSET ?
        `, [req.user.id, limit, offset]);

        res.json(rows);
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/sessions/:id', authenticateToken, async (req, res) => {
    try {
        const [sessionRows] = await pool.execute(
            'SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (sessionRows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const [exerciseRows] = await pool.execute(`
            SELECT se.*, e.name as exercise_name, e.weight_type,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', s.id,
                        'setNumber', s.set_number,
                        'weight', s.weight,
                        'reps', s.reps,
                        'rpe', s.rpe,
                        'performance', s.performance,
                        'completed', s.completed,
                        'notes', s.notes
                    )
                ) as sets
            FROM session_exercises se
            JOIN exercises e ON se.exercise_id = e.id
            LEFT JOIN sets s ON se.id = s.session_exercise_id
            WHERE se.session_id = ?
            GROUP BY se.id
            ORDER BY se.order_index
        `, [req.params.id]);

        res.json({
            ...sessionRows[0],
            exercises: exerciseRows.map(ex => ({
                ...ex,
                sets: ex.sets ? JSON.parse(ex.sets).filter(set => set.id !== null) : []
            }))
        });
    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/sessions', authenticateToken, async (req, res) => {
    try {
        const { workoutId, name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Session name is required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO workout_sessions (user_id, workout_id, name) VALUES (?, ?, ?)',
            [req.user.id, workoutId || null, name]
        );

        res.status(201).json({
            id: result.insertId,
            message: 'Session started successfully'
        });
    } catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add exercise to session
app.post('/api/sessions/:id/exercises', authenticateToken, async (req, res) => {
    try {
        const { exerciseId } = req.body;
        const sessionId = req.params.id;

        // Verify session belongs to user
        const [sessionRows] = await pool.execute(
            'SELECT id FROM workout_sessions WHERE id = ? AND user_id = ?',
            [sessionId, req.user.id]
        );

        if (sessionRows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Get next order index
        const [orderRows] = await pool.execute(
            'SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM session_exercises WHERE session_id = ?',
            [sessionId]
        );

        const [result] = await pool.execute(
            'INSERT INTO session_exercises (session_id, exercise_id, order_index) VALUES (?, ?, ?)',
            [sessionId, exerciseId, orderRows[0].next_order]
        );

        res.status(201).json({
            id: result.insertId,
            message: 'Exercise added to session'
        });
    } catch (error) {
        console.error('Add exercise to session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add set to exercise in session
app.post('/api/sessions/:sessionId/exercises/:exerciseId/sets', authenticateToken, async (req, res) => {
    try {
        const { weight, reps, rpe, performance, completed, notes } = req.body;
        const { sessionId, exerciseId } = req.params;

        // Verify session belongs to user
        const [sessionRows] = await pool.execute(
            'SELECT id FROM workout_sessions WHERE id = ? AND user_id = ?',
            [sessionId, req.user.id]
        );

        if (sessionRows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Get session exercise
        const [sessionExerciseRows] = await pool.execute(
            'SELECT id FROM session_exercises WHERE session_id = ? AND id = ?',
            [sessionId, exerciseId]
        );

        if (sessionExerciseRows.length === 0) {
            return res.status(404).json({ error: 'Exercise not found in session' });
        }

        // Get next set number
        const [setRows] = await pool.execute(
            'SELECT COALESCE(MAX(set_number), 0) + 1 as next_set FROM sets WHERE session_exercise_id = ?',
            [exerciseId]
        );

        const [result] = await pool.execute(
            'INSERT INTO sets (session_exercise_id, set_number, weight, reps, rpe, performance, completed, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [exerciseId, setRows[0].next_set, weight || 0, reps, rpe || null, performance || 'same', completed !== false, notes || null]
        );

        res.status(201).json({
            id: result.insertId,
            setNumber: setRows[0].next_set,
            message: 'Set added successfully'
        });
    } catch (error) {
        console.error('Add set error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete set
app.delete('/api/sets/:id', authenticateToken, async (req, res) => {
    try {
        // Verify set belongs to user's session
        const [rows] = await pool.execute(`
            SELECT s.id FROM sets s
            JOIN session_exercises se ON s.session_exercise_id = se.id
            JOIN workout_sessions ws ON se.session_id = ws.id
            WHERE s.id = ? AND ws.user_id = ?
        `, [req.params.id, req.user.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Set not found' });
        }

        await pool.execute('DELETE FROM sets WHERE id = ?', [req.params.id]);
        res.json({ message: 'Set deleted successfully' });
    } catch (error) {
        console.error('Delete set error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Finish session
app.put('/api/sessions/:id/finish', authenticateToken, async (req, res) => {
    try {
        const { notes } = req.body;

        const [rows] = await pool.execute(
            'SELECT id FROM workout_sessions WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        await pool.execute(
            'UPDATE workout_sessions SET end_time = NOW(), notes = ? WHERE id = ?',
            [notes || null, req.params.id]
        );

        // Update personal records
        await updatePersonalRecords(req.user.id, req.params.id);

        res.json({ message: 'Session finished successfully' });
    } catch (error) {
        console.error('Finish session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get last performance for exercise
app.get('/api/exercises/:id/last-performance', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT s.weight, s.reps, s.set_number, ws.start_time
            FROM sets s
            JOIN session_exercises se ON s.session_exercise_id = se.id
            JOIN workout_sessions ws ON se.session_id = ws.id
            WHERE se.exercise_id = ? AND ws.user_id = ? AND s.completed = 1
            ORDER BY ws.start_time DESC, s.set_number ASC
            LIMIT 5
        `, [req.params.id, req.user.id]);

        res.json(rows);
    } catch (error) {
        console.error('Get last performance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Personal records routes
app.get('/api/personal-records', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT pr.*, e.name as exercise_name, e.weight_type
            FROM personal_records pr
            JOIN exercises e ON pr.exercise_id = e.id
            WHERE pr.user_id = ?
            ORDER BY pr.date_achieved DESC, e.name
        `, [req.user.id]);

        res.json(rows);
    } catch (error) {
        console.error('Get personal records error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update personal records function
async function updatePersonalRecords(userId, sessionId) {
    try {
        const [sets] = await pool.execute(`
            SELECT s.*, se.exercise_id, ws.start_time
            FROM sets s
            JOIN session_exercises se ON s.session_exercise_id = se.id
            JOIN workout_sessions ws ON se.session_id = ws.id
            WHERE ws.id = ? AND ws.user_id = ? AND s.completed = 1
        `, [sessionId, userId]);

        for (const set of sets) {
            // Check if this is a new PR
            const [existing] = await pool.execute(`
                SELECT id FROM personal_records 
                WHERE user_id = ? AND exercise_id = ? AND weight >= ? AND reps >= ?
            `, [userId, set.exercise_id, set.weight, set.reps]);

            if (existing.length === 0) {
                // New PR found
                await pool.execute(`
                    INSERT IGNORE INTO personal_records (user_id, exercise_id, weight, reps, date_achieved, session_id)
                    VALUES (?, ?, ?, ?, DATE(?), ?)
                `, [userId, set.exercise_id, set.weight, set.reps, set.start_time, sessionId]);
            }
        }
    } catch (error) {
        console.error('Update personal records error:', error);
    }
}

// Admin routes
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const [rows] = await pool.execute(
            'SELECT * FROM admin_users WHERE username = ? AND is_active = 1',
            [username]
        );

        if (rows.length === 0 || !(await verifyPassword(password, rows[0].password_hash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = rows[0];
        const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, { expiresIn: '8h' });

        // Update last login
        await pool.execute('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [admin.id]);

        res.json({
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
        const [sessionCount] = await pool.execute('SELECT COUNT(*) as count FROM workout_sessions WHERE end_time IS NOT NULL');
        const [exerciseCount] = await pool.execute('SELECT COUNT(*) as count FROM exercises');
        const [prCount] = await pool.execute('SELECT COUNT(*) as count FROM personal_records');

        const [recentUsers] = await pool.execute(`
            SELECT username, email, created_at 
            FROM users 
            WHERE is_active = 1 
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        const [recentSessions] = await pool.execute(`
            SELECT ws.name, ws.start_time, ws.end_time, u.username
            FROM workout_sessions ws
            JOIN users u ON ws.user_id = u.id
            WHERE ws.end_time IS NOT NULL
            ORDER BY ws.end_time DESC
            LIMIT 10
        `);

        res.json({
            stats: {
                users: userCount[0].count,
                sessions: sessionCount[0].count,
                exercises: exerciseCount[0].count,
                personalRecords: prCount[0].count
            },
            recentUsers,
            recentSessions
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/admin/settings', authenticateAdmin, async (req, res) => {
    try {
        const settings = await getSettings();
        res.json(settings);
    } catch (error) {
        console.error('Get admin settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/admin/settings', authenticateAdmin, async (req, res) => {
    try {
        const settings = req.body;

        for (const [key, value] of Object.entries(settings)) {
            await pool.execute(
                'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
                [value, key]
            );
        }

        // Reinitialize email transporter
        await initializeEmailTransporter();

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update admin settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start server
async function startServer() {
    try {
        await initializeEmailTransporter();
        console.log('Email transporter initialized');

        app.listen(PORT, () => {
            console.log(`Gym Tracker server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();