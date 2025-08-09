const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database', 'gym_tracker.db');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
    
    // Create tables and default data
    initDatabase();
});

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

async function initDatabase() {
    // Create tables
    await createTables();
    
    // Create default admin user
    await createDefaultAdmin();
    
    // Insert default exercises
    await insertDefaultExercises();
}

function createTables() {
    return new Promise((resolve, reject) => {
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) NOT NULL,
                muscle_group VARCHAR(50) NOT NULL,
                description TEXT,
                instructions TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                date DATE NOT NULL,
                duration_minutes INTEGER,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            `CREATE TABLE IF NOT EXISTS workout_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                sets_count INTEGER NOT NULL,
                reps TEXT, -- JSON array
                weights TEXT, -- JSON array
                rest_time INTEGER,
                notes TEXT,
                FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
            )`,
            
            `CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
             AFTER UPDATE ON users
             BEGIN
                 UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
             END`
        ];
        
        let completed = 0;
        tables.forEach((sql, index) => {
            db.exec(sql, (err) => {
                if (err) {
                    console.error(`Error creating table ${index}:`, err);
                    reject(err);
                } else {
                    completed++;
                    if (completed === tables.length) {
                        console.log('Database tables created/verified');
                        resolve();
                    }
                }
            });
        });
    });
}

async function createDefaultAdmin() {
    return new Promise(async (resolve, reject) => {
        db.get('SELECT id FROM users WHERE username = ?', ['admin'], async (err, user) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (!user) {
                try {
                    const hashedPassword = await bcrypt.hash('admin123', 12);
                    db.run(
                        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                        ['admin', 'admin@gym.zhst.eu', hashedPassword, 'admin'],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                console.log('Default admin user created: admin/admin123');
                                resolve();
                            }
                        }
                    );
                } catch (error) {
                    reject(error);
                }
            } else {
                resolve();
            }
        });
    });
}

function insertDefaultExercises() {
    return new Promise((resolve, reject) => {
        const exercises = [
            ['Bankdrücken', 'Krafttraining', 'Brust', 'Grundübung für die Brustmuskulatur', 'Flach auf die Bank legen, Langhantel greifen und kontrolliert zur Brust führen'],
            ['Kniebeugen', 'Krafttraining', 'Beine', 'Grundübung für die Beinmuskulatur', 'Aufrecht stehen, in die Hocke gehen und wieder aufrichten'],
            ['Kreuzheben', 'Krafttraining', 'Rücken', 'Grundübung für den gesamten Körper', 'Langhantel vom Boden kontrolliert nach oben ziehen'],
            ['Klimmzüge', 'Krafttraining', 'Rücken', 'Übung für den Latissimus und Bizeps', 'An der Stange hängen und sich nach oben ziehen'],
            ['Schulterdrücken', 'Krafttraining', 'Schultern', 'Übung für die Schultermuskulatur', 'Hantel über den Kopf drücken'],
            ['Bizeps Curls', 'Krafttraining', 'Arme', 'Isolationsübung für den Bizeps', 'Hantel kontrolliert zum Körper führen'],
            ['Trizeps Dips', 'Krafttraining', 'Arme', 'Übung für den Trizeps', 'Körper an Stangen oder Bank nach unten und oben bewegen'],
            ['Plank', 'Krafttraining', 'Core', 'Statische Übung für die Rumpfmuskulatur', 'In Liegestützposition halten'],
            ['Laufband', 'Cardio', 'Cardio', 'Ausdauertraining', 'Gleichmäßiges Laufen auf dem Laufband'],
            ['Fahrrad', 'Cardio', 'Cardio', 'Ausdauertraining', 'Cardio-Training auf dem Ergometer']
        ];
        
        db.get('SELECT COUNT(*) as count FROM exercises', (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (result.count === 0) {
                const stmt = db.prepare('INSERT INTO exercises (name, category, muscle_group, description, instructions) VALUES (?, ?, ?, ?, ?)');
                
                exercises.forEach(exercise => {
                    stmt.run(exercise);
                });
                
                stmt.finalize((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Default exercises inserted');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    });
}

// JWT middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.sendStatus(401);
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Auth routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        db.get(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username],
            async (err, user) => {
                if (err) {
                    console.error('Login error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                
                if (!user) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
                
                try {
                    const validPassword = await bcrypt.compare(password, user.password_hash);
                    
                    if (!validPassword) {
                        return res.status(401).json({ error: 'Invalid credentials' });
                    }
                    
                    const token = jwt.sign(
                        { id: user.id, username: user.username, role: user.role },
                        process.env.JWT_SECRET,
                        { expiresIn: '24h' }
                    );
                    
                    res.json({
                        token,
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            role: user.role
                        }
                    });
                } catch (bcryptError) {
                    console.error('Bcrypt error:', bcryptError);
                    res.status(500).json({ error: 'Internal server error' });
                }
            }
        );
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);
        
        db.run(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        res.status(409).json({ error: 'Username or email already exists' });
                    } else {
                        console.error('Registration error:', err);
                        res.status(500).json({ error: 'Internal server error' });
                    }
                } else {
                    res.status(201).json({ message: 'User created successfully', userId: this.lastID });
                }
            }
        );
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Exercise routes
app.get('/api/exercises', authenticateToken, (req, res) => {
    db.all('SELECT * FROM exercises ORDER BY name', (err, exercises) => {
        if (err) {
            console.error('Get exercises error:', err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json(exercises);
        }
    });
});

app.post('/api/exercises', authenticateToken, (req, res) => {
    const { name, category, muscle_group, description, instructions } = req.body;
    
    if (!name || !category || !muscle_group) {
        return res.status(400).json({ error: 'Name, category and muscle_group are required' });
    }
    
    db.run(
        'INSERT INTO exercises (name, category, muscle_group, description, instructions) VALUES (?, ?, ?, ?, ?)',
        [name, category, muscle_group, description, instructions],
        function(err) {
            if (err) {
                console.error('Create exercise error:', err);
                res.status(500).json({ error: 'Internal server error' });
            } else {
                res.status(201).json({ message: 'Exercise created', exerciseId: this.lastID });
            }
        }
    );
});

app.get('/api/exercises/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM exercises WHERE id = ?', [req.params.id], (err, exercise) => {
        if (err) {
            console.error('Get exercise error:', err);
            res.status(500).json({ error: 'Internal server error' });
        } else if (!exercise) {
            res.status(404).json({ error: 'Exercise not found' });
        } else {
            res.json(exercise);
        }
    });
});

// Workout routes
app.get('/api/workouts', authenticateToken, (req, res) => {
    db.all(
        'SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC',
        [req.user.id],
        (err, workouts) => {
            if (err) {
                console.error('Get workouts error:', err);
                res.status(500).json({ error: 'Internal server error' });
            } else {
                res.json(workouts);
            }
        }
    );
});

app.post('/api/workouts', authenticateToken, (req, res) => {
    const { name, date, duration_minutes, notes, exercises } = req.body;
    
    if (!name || !date) {
        return res.status(400).json({ error: 'Name and date are required' });
    }
    
    db.run(
        'INSERT INTO workouts (user_id, name, date, duration_minutes, notes) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, name, date, duration_minutes, notes],
        function(err) {
            if (err) {
                console.error('Create workout error:', err);
                res.status(500).json({ error: 'Internal server error' });
            } else {
                const workoutId = this.lastID;
                
                // Add exercises to workout
                if (exercises && exercises.length > 0) {
                    const stmt = db.prepare(
                        'INSERT INTO workout_exercises (workout_id, exercise_id, sets_count, reps, weights, rest_time, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
                    );
                    
                    exercises.forEach(exercise => {
                        stmt.run([
                            workoutId,
                            exercise.exercise_id,
                            exercise.sets_count,
                            JSON.stringify(exercise.reps || []),
                            JSON.stringify(exercise.weights || []),
                            exercise.rest_time,
                            exercise.notes
                        ]);
                    });
                    
                    stmt.finalize((err) => {
                        if (err) {
                            console.error('Add workout exercises error:', err);
                        }
                    });
                }
                
                res.status(201).json({ message: 'Workout created', workoutId });
            }
        }
    );
});

app.get('/api/workouts/:id', authenticateToken, (req, res) => {
    db.get(
        'SELECT * FROM workouts WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        (err, workout) => {
            if (err) {
                console.error('Get workout error:', err);
                res.status(500).json({ error: 'Internal server error' });
            } else if (!workout) {
                res.status(404).json({ error: 'Workout not found' });
            } else {
                db.all(`
                    SELECT we.*, e.name as exercise_name, e.category, e.muscle_group
                    FROM workout_exercises we
                    JOIN exercises e ON we.exercise_id = e.id
                    WHERE we.workout_id = ?
                `, [req.params.id], (err, exercises) => {
                    if (err) {
                        console.error('Get workout exercises error:', err);
                        res.status(500).json({ error: 'Internal server error' });
                    } else {
                        workout.exercises = exercises.map(ex => ({
                            ...ex,
                            reps: JSON.parse(ex.reps || '[]'),
                            weights: JSON.parse(ex.weights || '[]')
                        }));
                        res.json(workout);
                    }
                });
            }
        }
    );
});

app.put('/api/workouts/:id', authenticateToken, (req, res) => {
    const { name, date, duration_minutes, notes } = req.body;
    
    db.run(
        'UPDATE workouts SET name = ?, date = ?, duration_minutes = ?, notes = ? WHERE id = ? AND user_id = ?',
        [name, date, duration_minutes, notes, req.params.id, req.user.id],
        function(err) {
            if (err) {
                console.error('Update workout error:', err);
                res.status(500).json({ error: 'Internal server error' });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Workout not found' });
            } else {
                res.json({ message: 'Workout updated' });
            }
        }
    );
});

app.delete('/api/workouts/:id', authenticateToken, (req, res) => {
    db.run(
        'DELETE FROM workouts WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        function(err) {
            if (err) {
                console.error('Delete workout error:', err);
                res.status(500).json({ error: 'Internal server error' });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Workout not found' });
            } else {
                res.json({ message: 'Workout deleted' });
            }
        }
    );
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const stats = {};
    
    // Get total workouts
    db.get(
        'SELECT COUNT(*) as count FROM workouts WHERE user_id = ?',
        [userId],
        (err, result) => {
            if (err) {
                console.error('Dashboard stats error:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            
            stats.totalWorkouts = result.count;
            
            // Get this week's workouts
            db.get(
                'SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND date >= date("now", "-7 days")',
                [userId],
                (err, result) => {
                    if (err) {
                        console.error('Dashboard stats error:', err);
                        return res.status(500).json({ error: 'Internal server error' });
                    }
                    
                    stats.thisWeekWorkouts = result.count;
                    
                    // Get total time
                    db.get(
                        'SELECT SUM(duration_minutes) as total FROM workouts WHERE user_id = ?',
                        [userId],
                        (err, result) => {
                            if (err) {
                                console.error('Dashboard stats error:', err);
                                return res.status(500).json({ error: 'Internal server error' });
                            }
                            
                            stats.totalTime = result.total || 0;
                            
                            // Get recent workouts
                            db.all(
                                'SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC LIMIT 5',
                                [userId],
                                (err, workouts) => {
                                    if (err) {
                                        console.error('Dashboard stats error:', err);
                                        return res.status(500).json({ error: 'Internal server error' });
                                    }
                                    
                                    stats.recentWorkouts = workouts;
                                    res.json(stats);
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// User profile routes
app.get('/api/user/profile', authenticateToken, (req, res) => {
    db.get(
        'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
        [req.user.id],
        (err, user) => {
            if (err) {
                console.error('Get profile error:', err);
                res.status(500).json({ error: 'Internal server error' });
            } else if (!user) {
                res.status(404).json({ error: 'User not found' });
            } else {
                res.json(user);
            }
        }
    );
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
    const { username, email } = req.body;
    
    if (!username || !email) {
        return res.status(400).json({ error: 'Username and email are required' });
    }
    
    db.run(
        'UPDATE users SET username = ?, email = ? WHERE id = ?',
        [username, email, req.user.id],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    res.status(409).json({ error: 'Username or email already exists' });
                } else {
                    console.error('Update profile error:', err);
                    res.status(500).json({ error: 'Internal server error' });
                }
            } else {
                res.json({ message: 'Profile updated successfully' });
            }
        }
    );
});

app.put('/api/user/password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
    }
    
    db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id], async (err, user) => {
        if (err) {
            console.error('Change password error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        try {
            const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
            
            if (!validPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
            
            const hashedNewPassword = await bcrypt.hash(newPassword, 12);
            
            db.run(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [hashedNewPassword, req.user.id],
                function(err) {
                    if (err) {
                        console.error('Update password error:', err);
                        res.status(500).json({ error: 'Internal server error' });
                    } else {
                        res.json({ message: 'Password updated successfully' });
                    }
                }
            );
        } catch (bcryptError) {
            console.error('Bcrypt error:', bcryptError);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    db.get('SELECT 1', (err) => {
        if (err) {
            res.status(500).json({ status: 'error', message: 'Database connection failed' });
        } else {
            res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                database: 'SQLite',
                version: process.version
            });
        }
    });
});

// Serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🏋️ Gym Tracker server running on port ${PORT}`);
    console.log(`📱 Access the application at: http://localhost:${PORT}`);
    console.log(`💾 Database: ${DB_PATH}`);
    console.log(`🔐 Default admin: admin/admin123`);
});