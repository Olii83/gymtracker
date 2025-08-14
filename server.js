// Gym Tracker Backend Server
// File: server.js

// Import required modules
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const cors = require('cors');

// Initialize Express app
const app = express();
const port = 3000;

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Enable JSON body parsing
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Database setup
const dbPath = path.join(__dirname, 'data', 'gym_tracker.db');
let db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create tables if they don't exist
        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            // Exercises table
            db.run(`CREATE TABLE IF NOT EXISTS exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT,
                muscle_group TEXT,
                description TEXT,
                instructions TEXT,
                default_sets INTEGER,
                equipment TEXT,
                UNIQUE(name, category, muscle_group)
            )`);
            // Workouts table
            db.run(`CREATE TABLE IF NOT EXISTS workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                date DATE NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`);
            // Workout Exercises table (many-to-many relationship)
            db.run(`CREATE TABLE IF NOT EXISTS workout_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_id INTEGER,
                exercise_id INTEGER,
                exercise_order INTEGER,
                sets_count INTEGER,
                reps TEXT,
                weights TEXT,
                distance REAL,
                duration_seconds INTEGER,
                rest_time INTEGER DEFAULT 90,
                notes TEXT,
                FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
            )`);
            // Templates table
            db.run(`CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                category TEXT,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`);
            // Template Exercises table (many-to-many relationship)
            db.run(`CREATE TABLE IF NOT EXISTS template_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_id INTEGER,
                exercise_id INTEGER,
                suggested_sets INTEGER,
                suggested_reps TEXT,
                suggested_weight REAL,
                notes TEXT,
                FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
            )`);
            // Insert initial data if exercises table is empty
            db.get(`SELECT COUNT(*) as count FROM exercises`, (err, row) => {
                if (err) {
                    console.error('Error checking exercise count:', err.message);
                    return;
                }
                if (row.count === 0) {
                    const stmt = db.prepare(`INSERT INTO exercises (name, category, muscle_group, description, instructions, default_sets, equipment) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                    const defaultExercises = [
                        // Brust-Übungen
                        ['Bankdrücken', 'Krafttraining', 'Brust', 'Grundübung für die Brustmuskulatur', 'Langhantel von der Brust hochdrücken', 4, 'Langhantel, Bank'],
                        ['Schrägbankdrücken', 'Krafttraining', 'Brust', 'Übung für obere Brust', 'Langhantel auf einer schrägen Bank hochdrücken', 3, 'Langhantel, Bank'],
                        ['Kabelzug', 'Krafttraining', 'Brust', 'Isolationsübung für die Brust', 'Kabel von oben nach vorne zusammenführen', 3, 'Kabelzugmaschine'],
                        ['Dips', 'Krafttraining', 'Brust', 'Körpergewichtsübung für untere Brust und Trizeps', 'An parallelen Stangen Körper absenken und wieder hochdrücken', 3, 'Dip-Stangen'],

                        // Rücken-Übungen
                        ['Kreuzheben', 'Krafttraining', 'Rücken', 'Grundübung für den gesamten Körper', 'Langhantel vom Boden mit geradem Rücken kontrolliert nach oben ziehen', 4, 'Langhantel'],
                        ['Klimmzüge', 'Krafttraining', 'Rücken', 'Übung für Latissimus und Bizeps', 'An der Stange hängen und sich kontrolliert nach oben ziehen', 3, 'Klimmzugstange'],
                        ['Langhantelrudern', 'Krafttraining', 'Rücken', 'Horizontales Ziehen für den mittleren Rücken', 'Langhantel horizontal zum Körper ziehen, Ellbogen nah am Körper', 3, 'Langhantel'],
                        ['Kurzhantelrudern', 'Krafttraining', 'Rücken', 'Einarmiges Rudern mit Kurzhantel', 'Einseitig mit Abstützung auf Bank, Kurzhantel zum Körper ziehen', 2, 'Kurzhantel, Bank'],
                        ['Latzug', 'Krafttraining', 'Rücken', 'Vertikales Ziehen am Kabelzug', 'Griff über Kopf nach unten zur Brust ziehen', 2, 'Latzugmaschine'],
                        ['T-Bar Rudern', 'Krafttraining', 'Rücken', 'Rudern mit T-Bar für mittleren Rücken', 'T-Bar mit beiden Händen greifen und zum Körper ziehen', 3, 'T-Bar'],

                        // Bein-Übungen
                        ['Kniebeugen', 'Krafttraining', 'Beine', 'Umfassende Übung für die Beinmuskulatur', 'Mit einer Langhantel auf dem Rücken in die Hocke gehen', 4, 'Langhantel, Kniebeugenständer'],
                        ['Beinpresse', 'Krafttraining', 'Beine', 'Sicherheitsübung für Beinmuskeln', 'Gewicht mit den Beinen nach oben drücken', 3, 'Beinpresse'],
                        ['Ausfallschritte', 'Krafttraining', 'Beine', 'Dynamische Übung für Beine und Gesäß', 'Mit einem Schritt nach vorne in die Hocke gehen', 3, 'Kurzhanteln'],
                        ['Beinstrecker', 'Krafttraining', 'Beine', 'Isolationsübung für den Quadrizeps', 'Beine gegen Widerstand nach oben strecken', 3, 'Beinstrecker-Maschine'],
                        ['Beinbeuger', 'Krafttraining', 'Beine', 'Isolationsübung für die hinteren Oberschenkel', 'Beine gegen Widerstand nach hinten beugen', 3, 'Beinbeuger-Maschine'],
                        ['Wadenheben', 'Krafttraining', 'Beine', 'Übung für die Wadenmuskulatur', 'Auf den Zehenspitzen hochdrücken', 4, 'Wadenmaschine'],

                        // Schulter-Übungen
                        ['Überkopfdrücken', 'Krafttraining', 'Schultern', 'Grundübung für die Schultern', 'Langhantel über den Kopf drücken', 4, 'Langhantel'],
                        ['Seitheben', 'Krafttraining', 'Schultern', 'Isolationsübung für seitliche Schultern', 'Kurzhanteln seitlich anheben', 3, 'Kurzhanteln'],
                        ['Frontheben', 'Krafttraining', 'Schultern', 'Isolationsübung für vordere Schultern', 'Kurzhanteln oder eine Stange nach vorne anheben', 3, 'Kurzhanteln, Langhantel'],
                        ['Schulterdrücken', 'Krafttraining', 'Schultern', 'Schulterdrücken mit Kurzhanteln', 'Kurzhanteln über dem Kopf zusammenführen', 3, 'Kurzhanteln'],

                        // Arm-Übungen
                        ['Bizeps-Curls', 'Krafttraining', 'Arme', 'Isolationsübung für den Bizeps', 'Kurzhantel kontrolliert nach oben beugen', 3, 'Kurzhanteln'],
                        ['Hammer-Curls', 'Krafttraining', 'Arme', 'Bizepsübung mit neutralem Griff', 'Kurzhanteln im neutralen Griff beugen', 3, 'Kurzhanteln'],
                        ['Trizepsdrücken', 'Krafttraining', 'Arme', 'Isolationsübung für den Trizeps', 'Kabelzug nach unten drücken', 3, 'Kabelzugmaschine'],
                        ['French Press', 'Krafttraining', 'Arme', 'Trizeps-Isolationsübung im Liegen', 'Eine Langhantel hinter den Kopf absenken und wieder hochdrücken', 3, 'Langhantel, Bank'],
                        ['Kabel-Curls', 'Krafttraining', 'Arme', 'Bizeps-Übung mit Kabel', 'Kabelzug von unten nach oben ziehen', 3, 'Kabelzugmaschine'],

                        // Core-Übungen
                        ['Plank', 'Krafttraining', 'Core', 'Stabilisationsübung für den Core', 'Körper in einer geraden Linie halten', 3, 'Matte'],
                        ['Russian Twist', 'Krafttraining', 'Core', 'Rotationsübung für die seitliche Bauchmuskulatur', 'Oberkörper rotieren, während man auf dem Boden sitzt', 3, 'Gewichtsplatte, Hantel'],
                        ['Crunches', 'Krafttraining', 'Core', 'Isolationsübung für die Bauchmuskulatur', 'Oberkörper von der Matte anheben', 3, 'Matte'],

                        // Cardio-Übungen
                        ['Laufen', 'Cardio', 'Cardio', 'Grundlegendes Herz-Kreislauf-Training', 'Einfaches Laufen auf dem Laufband oder im Freien', 1, 'Laufband'],
                        ['Radfahren', 'Cardio', 'Cardio', 'Fahrradtraining', 'Mit dem Fahrrad fahren', 1, 'Fahrrad'],
                        ['Schwimmen', 'Cardio', 'Cardio', 'Ganzkörper-Cardio-Übung', 'Schwimmen', 1, 'Schwimmbad']
                    ];
                    defaultExercises.forEach(ex => {
                        stmt.run(ex);
                    });
                    stmt.finalize();
                    console.log('Default exercises inserted.');
                }
            });
        });
    }
});

// Secret for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key'; // Use environment variable in production

// Auth middleware to check for a valid token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        console.warn('Authentication failed: No token provided.');
        return res.status(401).json({ error: 'Authentication token is required.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Authentication failed:', err.message);
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
};

// Admin middleware to check for admin role
const authenticateAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        console.warn('Authorization failed: User is not an admin.');
        res.status(403).json({ error: 'Admin access required.' });
    }
};

// ========================================================================================
// API ROUTES
// ========================================================================================

// ======================= AUTH ROUTES =======================

// User registration
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email and password are required.' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`, [username, email, passwordHash], function(err) {
            if (err) {
                console.error('Registration error:', err.message);
                return res.status(500).json({ error: 'Registration failed. Username or email might already be in use.' });
            }
            res.status(201).json({ message: 'User registered successfully!' });
        });
    } catch (err) {
        console.error('Hashing error:', err.message);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// User login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    db.get(`SELECT * FROM users WHERE username = ? OR email = ?`, [username, username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Server error during login.' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        try {
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid credentials.' });
            }

            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
        } catch (err) {
            console.error('Login error:', err.message);
            res.status(500).json({ error: 'Server error during login.' });
        }
    });
});

// Verify token and get user info
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    // Token is valid, return user info
    const userId = req.user.id;
    db.get(`SELECT id, username, email, role FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err || !user) {
            console.error('User not found during verification:', err?.message);
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ user });
    });
});

// ======================= USER ROUTES =======================

// Update user profile
app.put('/api/profile', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { username, email } = req.body;
    
    if (!username || !email) {
        return res.status(400).json({ error: 'Username and email are required.' });
    }
    
    db.run(`UPDATE users SET username = ?, email = ? WHERE id = ?`, [username, email, userId], function(err) {
        if (err) {
            console.error('Profile update error:', err.message);
            return res.status(500).json({ error: 'Failed to update profile.' });
        }
        res.json({ message: 'Profile updated successfully!' });
    });
});

// Change user password
app.put('/api/profile/password', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Old and new passwords are required.' });
    }

    try {
        db.get(`SELECT password_hash FROM users WHERE id = ?`, [userId], async (err, row) => {
            if (err || !row) {
                return res.status(500).json({ error: 'Failed to find user.' });
            }

            const isMatch = await bcrypt.compare(oldPassword, row.password_hash);
            if (!isMatch) {
                return res.status(401).json({ error: 'Incorrect old password.' });
            }
            
            const newPasswordHash = await bcrypt.hash(newPassword, 10);
            db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [newPasswordHash, userId], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to change password.' });
                }
                res.json({ message: 'Password changed successfully!' });
            });
        });
    } catch (err) {
        console.error('Password change error:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Export user data
app.get('/api/user/export', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.all(`SELECT * FROM workouts WHERE user_id = ?`, [userId], (err, workouts) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to export data.' });
        }
        res.json({ workouts });
    });
});


// ======================= WORKOUTS ROUTES =======================

// Get all workouts for a user
app.get('/api/workouts', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const sql = `
        SELECT 
            w.id, w.name, w.date, w.notes, 
            we.id as we_id, we.exercise_id, we.exercise_order, we.sets_count,
            we.reps, we.weights, we.distance, we.duration_seconds, we.rest_time, we.notes as exercise_notes,
            e.name as exercise_name, e.muscle_group, e.category
        FROM workouts w
        LEFT JOIN workout_exercises we ON w.id = we.workout_id
        LEFT JOIN exercises e ON we.exercise_id = e.id
        WHERE w.user_id = ?
        ORDER BY w.date DESC, w.id DESC, we.exercise_order ASC
    `;
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            console.error('Workouts fetch error:', err.message);
            return res.status(500).json({ error: 'Failed to fetch workouts.' });
        }

        const workouts = {};
        rows.forEach(row => {
            if (!workouts[row.id]) {
                workouts[row.id] = {
                    id: row.id,
                    name: row.name,
                    date: row.date,
                    notes: row.notes,
                    exercises: []
                };
            }
            if (row.we_id) {
                workouts[row.id].exercises.push({
                    id: row.we_id,
                    exercise_id: row.exercise_id,
                    exercise_order: row.exercise_order,
                    exercise_name: row.exercise_name,
                    muscle_group: row.muscle_group,
                    sets_count: row.sets_count,
                    reps: JSON.parse(row.reps || '[]'),
                    weights: JSON.parse(row.weights || '[]'),
                    distance: row.distance,
                    duration_seconds: row.duration_seconds,
                    rest_time: row.rest_time,
                    notes: row.exercise_notes
                });
            }
        });
        res.json(Object.values(workouts));
    });
});

// Create a new workout
app.post('/api/workouts', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { name, date, notes, exercises } = req.body;
    if (!name || !date || !exercises) {
        return res.status(400).json({ error: 'Workout name, date, and exercises are required.' });
    }

    db.run(`INSERT INTO workouts (user_id, name, date, notes) VALUES (?, ?, ?, ?)`, [userId, name, date, notes], function(workoutErr) {
        if (workoutErr) {
            console.error('Workout creation error:', workoutErr.message);
            return res.status(500).json({ error: 'Failed to create workout.' });
        }
        const workoutId = this.lastID;
        
        let exercisesProcessed = 0;
        let exerciseErrors = 0;

        exercises.forEach((exercise, index) => {
            const { exercise_id, sets_count, reps, weights, distance, duration_seconds, rest_time, notes: exerciseNotes } = exercise;
            db.run(
                `INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets_count, 
                                                reps, weights, distance, duration_seconds, rest_time, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [workoutId, exercise_id, index + 1, sets_count,
                 reps ? JSON.stringify(reps) : null,
                 weights ? JSON.stringify(weights) : null,
                 distance || null, duration_seconds || null,
                 rest_time || 90, exerciseNotes || null],
                function(exerciseErr) {
                    if (exerciseErr) {
                        console.error('Workout exercise insertion error:', exerciseErr.message);
                        exerciseErrors++;
                    }
                    exercisesProcessed++;
                    if (exercisesProcessed === exercises.length) {
                        if (exerciseErrors > 0) {
                            return res.status(500).json({ error: 'Workout created, but failed to add all exercises.' });
                        }
                        res.status(201).json({ message: 'Workout created successfully!', id: workoutId });
                    }
                }
            );
        });
    });
});

// Update a workout
app.put('/api/workouts/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const workoutId = req.params.id;
    const { name, date, notes, exercises } = req.body;

    if (!name || !date || !exercises) {
        return res.status(400).json({ error: 'Workout name, date, and exercises are required.' });
    }

    db.get(`SELECT user_id FROM workouts WHERE id = ?`, [workoutId], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Workout not found.' });
        }
        if (row.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden.' });
        }

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            // Update workout details
            db.run(`UPDATE workouts SET name = ?, date = ?, notes = ? WHERE id = ?`, [name, date, notes, workoutId], function(updateErr) {
                if (updateErr) {
                    console.error('Workout update error:', updateErr.message);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to update workout details.' });
                }

                // Delete old workout exercises
                db.run(`DELETE FROM workout_exercises WHERE workout_id = ?`, [workoutId], function(deleteErr) {
                    if (deleteErr) {
                        console.error('Workout exercise delete error:', deleteErr.message);
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Failed to update exercises.' });
                    }

                    // Insert new workout exercises
                    let exercisesProcessed = 0;
                    let exerciseErrors = 0;
                    if (exercises.length === 0) {
                        db.run('COMMIT');
                        return res.json({ message: 'Workout updated successfully!' });
                    }
                    exercises.forEach((exercise, index) => {
                        const { exercise_id, sets_count, reps, weights, distance, duration_seconds, rest_time, notes: exerciseNotes } = exercise;
                        db.run(
                            `INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets_count, 
                                                            reps, weights, distance, duration_seconds, rest_time, notes)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [workoutId, exercise_id, index + 1, sets_count,
                             reps ? JSON.stringify(reps) : null,
                             weights ? JSON.stringify(weights) : null,
                             distance || null, duration_seconds || null,
                             rest_time || 90, exerciseNotes || null],
                            function(exerciseErr) {
                                if (exerciseErr) {
                                    console.error('Workout exercise update error:', exerciseErr.message);
                                    exerciseErrors++;
                                }
                                exercisesProcessed++;
                                if (exercisesProcessed === exercises.length) {
                                    if (exerciseErrors > 0) {
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ error: 'Workout updated, but failed to add all exercises.' });
                                    }
                                    db.run('COMMIT', (commitErr) => {
                                        if (commitErr) {
                                            console.error('Transaction commit error:', commitErr.message);
                                            return res.status(500).json({ error: 'Failed to complete update.' });
                                        }
                                        res.json({ message: 'Workout updated successfully!' });
                                    });
                                }
                            }
                        );
                    });
                });
            });
        });
    });
});

// Delete a workout
app.delete('/api/workouts/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const workoutId = req.params.id;

    db.run(`DELETE FROM workouts WHERE id = ? AND user_id = ?`, [workoutId, userId], function(err) {
        if (err) {
            console.error('Workout deletion error:', err.message);
            return res.status(500).json({ error: 'Failed to delete workout.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Workout not found or not authorized.' });
        }
        res.json({ message: 'Workout deleted successfully!' });
    });
});

// ======================= EXERCISES ROUTES =======================

// Get all exercises
app.get('/api/exercises', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM exercises ORDER BY name ASC`, [], (err, rows) => {
        if (err) {
            console.error('Exercises fetch error:', err.message);
            return res.status(500).json({ error: 'Failed to fetch exercises.' });
        }
        res.json(rows);
    });
});

// Create a new exercise (Admin only)
app.post('/api/exercises', authenticateToken, authenticateAdmin, (req, res) => {
    const { name, category, muscle_group, description, instructions, default_sets, equipment } = req.body;
    if (!name || !category || !muscle_group) {
        return res.status(400).json({ error: 'Name, category, and muscle group are required.' });
    }
    db.run(`INSERT INTO exercises (name, category, muscle_group, description, instructions, default_sets, equipment) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, category, muscle_group, description, instructions, default_sets, equipment],
        function(err) {
            if (err) {
                console.error('Exercise creation error:', err.message);
                return res.status(500).json({ error: 'Failed to create exercise. It may already exist.' });
            }
            res.status(201).json({ message: 'Exercise created successfully!', id: this.lastID });
        }
    );
});

// Update an exercise (Admin only)
app.put('/api/exercises/:id', authenticateToken, authenticateAdmin, (req, res) => {
    const exerciseId = req.params.id;
    const { name, category, muscle_group, description, instructions, default_sets, equipment } = req.body;
    if (!name || !category || !muscle_group) {
        return res.status(400).json({ error: 'Name, category, and muscle group are required.' });
    }
    db.run(`UPDATE exercises SET name = ?, category = ?, muscle_group = ?, description = ?, instructions = ?, default_sets = ?, equipment = ? WHERE id = ?`,
        [name, category, muscle_group, description, instructions, default_sets, equipment, exerciseId],
        function(err) {
            if (err) {
                console.error('Exercise update error:', err.message);
                return res.status(500).json({ error: 'Failed to update exercise.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Exercise not found.' });
            }
            res.json({ message: 'Exercise updated successfully!' });
        }
    );
});

// Delete an exercise (Admin only)
app.delete('/api/exercises/:id', authenticateToken, authenticateAdmin, (req, res) => {
    const exerciseId = req.params.id;
    db.run(`DELETE FROM exercises WHERE id = ?`, [exerciseId], function(err) {
        if (err) {
            console.error('Exercise deletion error:', err.message);
            return res.status(500).json({ error: 'Failed to delete exercise.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Exercise not found.' });
        }
        res.json({ message: 'Exercise deleted successfully!' });
    });
});


// ======================= TEMPLATES ROUTES =======================

// Get all templates for a user
app.get('/api/templates', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const sql = `
        SELECT 
            t.id, t.name, t.category, t.description,
            te.id as te_id, te.exercise_id, te.suggested_sets, te.suggested_reps, te.suggested_weight, te.notes,
            e.name as exercise_name, e.muscle_group, e.category as exercise_category
        FROM templates t
        LEFT JOIN template_exercises te ON t.id = te.template_id
        LEFT JOIN exercises e ON te.exercise_id = e.id
        WHERE t.user_id = ?
        ORDER BY t.name ASC
    `;
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            console.error('Templates fetch error:', err.message);
            return res.status(500).json({ error: 'Failed to fetch templates.' });
        }

        const templates = {};
        rows.forEach(row => {
            if (!templates[row.id]) {
                templates[row.id] = {
                    id: row.id,
                    name: row.name,
                    category: row.category,
                    description: row.description,
                    exercises: []
                };
            }
            if (row.te_id) {
                templates[row.id].exercises.push({
                    id: row.te_id,
                    exercise_id: row.exercise_id,
                    exercise_name: row.exercise_name,
                    muscle_group: row.muscle_group,
                    suggested_sets: row.suggested_sets,
                    suggested_reps: JSON.parse(row.suggested_reps || '[]'),
                    suggested_weight: row.suggested_weight,
                    notes: row.notes
                });
            }
        });
        res.json(Object.values(templates));
    });
});

// Create a new template
app.post('/api/templates', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { name, category, description, exercises } = req.body;
    if (!name || !exercises) {
        return res.status(400).json({ error: 'Template name and exercises are required.' });
    }

    db.run(`INSERT INTO templates (user_id, name, category, description) VALUES (?, ?, ?, ?)`, [userId, name, category, description], function(templateErr) {
        if (templateErr) {
            console.error('Template creation error:', templateErr.message);
            return res.status(500).json({ error: 'Failed to create template.' });
        }
        const templateId = this.lastID;
        
        let exercisesProcessed = 0;
        let exerciseErrors = 0;

        exercises.forEach(exercise => {
            const { exercise_id, suggested_sets, suggested_reps, suggested_weight, notes } = exercise;
            db.run(
                `INSERT INTO template_exercises (template_id, exercise_id, suggested_sets, suggested_reps, suggested_weight, notes)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [templateId, exercise_id, suggested_sets || 0,
                 suggested_reps ? JSON.stringify(suggested_reps) : null,
                 suggested_weight || 0, notes || null],
                function(exerciseErr) {
                    if (exerciseErr) {
                        console.error('Template exercise insertion error:', exerciseErr.message);
                        exerciseErrors++;
                    }
                    exercisesProcessed++;
                    if (exercisesProcessed === exercises.length) {
                        if (exerciseErrors > 0) {
                            return res.status(500).json({ error: 'Template created, but failed to add all exercises.' });
                        }
                        res.status(201).json({ message: 'Template created successfully!', id: templateId });
                    }
                }
            );
        });
    });
});

// Delete a template
app.delete('/api/templates/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const templateId = req.params.id;

    db.run(`DELETE FROM templates WHERE id = ? AND user_id = ?`, [templateId, userId], function(err) {
        if (err) {
            console.error('Template deletion error:', err.message);
            return res.status(500).json({ error: 'Failed to delete template.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Template not found or not authorized.' });
        }
        res.json({ message: 'Template deleted successfully!' });
    });
});

// ======================= ADMIN ROUTES =======================

// Get all users (Admin only)
app.get('/api/admin/users', authenticateToken, authenticateAdmin, (req, res) => {
    db.all(`SELECT id, username, email, role, created_at FROM users`, [], (err, rows) => {
        if (err) {
            console.error('Admin users fetch error:', err.message);
            return res.status(500).json({ error: 'Failed to fetch users.' });
        }
        res.json(rows);
    });
});

// Get admin stats (Admin only)
app.get('/api/admin/stats', authenticateToken, authenticateAdmin, (req, res) => {
    db.get(`SELECT COUNT(*) as totalUsers FROM users`, (err, totalUsers) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch stats.' });
        }
        db.get(`SELECT COUNT(*) as activeWorkouts FROM workouts WHERE date >= date('now', '-30 days')`, (err, activeWorkouts) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch stats.' });
            }
            db.get(`SELECT COUNT(*) as newUsersLast30Days FROM users WHERE created_at >= date('now', '-30 days')`, (err, newUsers) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to fetch stats.' });
                }
                res.json({
                    totalUsers: totalUsers.totalUsers,
                    activeWorkouts: activeWorkouts.activeWorkouts,
                    newUsersLast30Days: newUsers.newUsersLast30Days
                });
            });
        });
    });
});

// Reset user password (Admin only)
app.put('/api/admin/users/:id/password', authenticateToken, authenticateAdmin, async (req, res) => {
    const userId = req.params.id;
    const { newPassword } = req.body;
    if (!newPassword) {
        return res.status(400).json({ error: 'New password is required.' });
    }

    try {
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [newPasswordHash, userId], function(err) {
            if (err) {
                console.error('Admin password reset error:', err.message);
                return res.status(500).json({ error: 'Failed to reset password.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }
            res.json({ message: 'Password reset successfully!' });
        });
    } catch (err) {
        console.error('Hashing error:', err.message);
        res.status(500).json({ error: 'Server error during password reset.' });
    }
});

// Delete user (Admin only)
app.delete('/api/admin/users/:id', authenticateToken, authenticateAdmin, (req, res) => {
    const userId = req.params.id;
    db.run(`DELETE FROM users WHERE id = ?`, [userId], function(err) {
        if (err) {
            console.error('Admin user deletion error:', err.message);
            return res.status(500).json({ error: 'Failed to delete user.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ message: 'User deleted successfully!' });
    });
});

// Perform database maintenance (Admin only)
app.post('/api/admin/maintenance', authenticateToken, authenticateAdmin, (req, res) => {
    db.run('VACUUM', (err) => {
        if (err) {
            console.error('Maintenance error:', err.message);
            return res.status(500).json({ error: 'Database maintenance failed.' });
        }
        res.json({ message: 'Database maintenance successful.' });
    });
});

// Create database backup (Admin only)
app.post('/api/admin/backup', authenticateToken, authenticateAdmin, (req, res) => {
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupPath = path.join(backupDir, `gym_tracker_${timestamp}.db`);

    const backupDb = new sqlite3.Database(backupPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
            console.error('Backup database creation error:', err.message);
            return res.status(500).json({ error: 'Failed to create backup database file.' });
        }
        const backup = backupDb.backup(dbPath, (backupErr) => {
            if (backupErr) {
                console.error('Database backup error:', backupErr);
                return res.status(500).json({ error: 'Failed to create database backup.' });
            }
            console.log('Database backup created successfully!');
            res.json({ message: 'Database backup successful!', filename: path.basename(backupPath) });
        });
        backup.step(-1, (stepErr) => {
            if (stepErr) {
                console.error('Backup step error:', stepErr);
            }
            backup.finish(() => {
                console.log('Backup finished.');
            });
        });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});

