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
app.use(express.json({ limit: '10mb' }));
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
    try {
        await createTables();
        await createDefaultAdmin();
        await insertDefaultExercises();
        console.log('Database initialization completed');
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
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
                first_name VARCHAR(50),
                last_name VARCHAR(50),
                is_active BOOLEAN DEFAULT 1,
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )`,
            
            `CREATE TABLE IF NOT EXISTS workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                date DATE NOT NULL,
                duration_minutes INTEGER,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            `CREATE TABLE IF NOT EXISTS workout_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                sets_count INTEGER NOT NULL DEFAULT 1,
                reps TEXT, -- JSON array
                weights TEXT, -- JSON array
                rest_time INTEGER DEFAULT 90,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
            )`,
            
            // Create indexes for better performance
            `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
            `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
            `CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date)`,
            `CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id)`,
            `CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category)`,
            `CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group)`,
            
            // Create triggers for updated_at
            `CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
             AFTER UPDATE ON users
             BEGIN
                 UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
             END`,
             
            `CREATE TRIGGER IF NOT EXISTS update_workouts_timestamp 
             AFTER UPDATE ON workouts
             BEGIN
                 UPDATE workouts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
             END`
        ];
        
        let completed = 0;
        const errors = [];
        
        tables.forEach((sql, index) => {
            db.exec(sql, (err) => {
                if (err) {
                    console.error(`Error creating table/index ${index}:`, err);
                    errors.push(err);
                }
                completed++;
                
                if (completed === tables.length) {
                    if (errors.length > 0) {
                        reject(new Error(`Failed to create some tables: ${errors.length} errors`));
                    } else {
                        console.log('Database schema created/verified successfully');
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
                        'INSERT INTO users (username, email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
                        ['admin', 'admin@gym.zhst.eu', hashedPassword, 'admin', 'Admin', 'User'],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                console.log('✅ Default admin user created: admin/admin123');
                                resolve();
                            }
                        }
                    );
                } catch (error) {
                    reject(error);
                }
            } else {
                console.log('✅ Default admin user already exists');
                resolve();
            }
        });
    });
}

function insertDefaultExercises() {
    return new Promise((resolve, reject) => {
        const exercises = [
            // Chest exercises
            ['Bankdrücken', 'Krafttraining', 'Brust', 'Grundübung für die Brustmuskulatur', 'Flach auf die Bank legen, Langhantel greifen und kontrolliert zur Brust führen'],
            ['Schrägbankdrücken', 'Krafttraining', 'Brust', 'Bankdrücken auf der Schrägbank für obere Brust', 'Bank auf 30-45° einstellen, Langhantel kontrolliert zur oberen Brust führen'],
            ['Kurzhantel Bankdrücken', 'Krafttraining', 'Brust', 'Bankdrücken mit Kurzhanteln', 'Mit Kurzhanteln für größeren Bewegungsumfang'],
            ['Fliegende', 'Krafttraining', 'Brust', 'Isolationsübung für die Brust', 'Mit Kurzhanteln bogenförmige Bewegung zur Brustmitte'],
            ['Liegestütze', 'Krafttraining', 'Brust', 'Körpergewichtsübung für Brust und Arme', 'Körperspannung halten, kontrolliert nach unten und oben'],

            // Back exercises
            ['Kreuzheben', 'Krafttraining', 'Rücken', 'Grundübung für den gesamten Körper', 'Langhantel vom Boden kontrolliert nach oben ziehen'],
            ['Klimmzüge', 'Krafttraining', 'Rücken', 'Übung für den Latissimus und Bizeps', 'An der Stange hängen und sich nach oben ziehen'],
            ['Langhantelrudern', 'Krafttraining', 'Rücken', 'Horizontales Ziehen für den Rücken', 'Langhantel horizontal zum Körper ziehen'],
            ['Kurzhantelrudern', 'Krafttraining', 'Rücken', 'Einarmiges Rudern mit Kurzhantel', 'Einseitig mit Abstützung auf Bank'],
            ['Latzug', 'Krafttraining', 'Rücken', 'Vertikales Ziehen am Kabelzug', 'Griff über Kopf nach unten ziehen'],

            // Leg exercises
            ['Kniebeugen', 'Krafttraining', 'Beine', 'Grundübung für die Beinmuskulatur', 'Aufrecht stehen, in die Hocke gehen und wieder aufrichten'],
            ['Beinpresse', 'Krafttraining', 'Beine', 'Maschinenübung für Quadrizeps und Gesäß', 'Plattform mit den Beinen wegdrücken'],
            ['Ausfallschritte', 'Krafttraining', 'Beine', 'Unilaterale Beinübung', 'Schritt nach vorn, Knie beugen und zurück'],
            ['Beincurls', 'Krafttraining', 'Beine', 'Isolationsübung für Beinbeuger', 'Liegend Fersen zum Gesäß führen'],
            ['Beinstrecker', 'Krafttraining', 'Beine', 'Isolationsübung für Quadrizeps', 'Sitzend Unterschenkel strecken'],
            ['Wadenheben', 'Krafttraining', 'Beine', 'Übung für die Wadenmuskulatur', 'Auf Zehenspitzen stellen und senken'],

            // Shoulder exercises
            ['Schulterdrücken', 'Krafttraining', 'Schultern', 'Übung für die Schultermuskulatur', 'Hantel oder Langhantel über den Kopf drücken'],
            ['Seitheben', 'Krafttraining', 'Schultern', 'Isolationsübung für seitliche Schulter', 'Kurzhanteln seitlich bis Schulterhöhe heben'],
            ['Frontheben', 'Krafttraining', 'Schultern', 'Isolationsübung für vordere Schulter', 'Kurzhanteln nach vorn bis Schulterhöhe heben'],
            ['Reverse Flys', 'Krafttraining', 'Schultern', 'Übung für hintere Schulter', 'Gebeugt Arme nach hinten führen'],

            // Arm exercises
            ['Bizeps Curls', 'Krafttraining', 'Arme', 'Isolationsübung für den Bizeps', 'Hantel kontrolliert zum Körper führen'],
            ['Hammer Curls', 'Krafttraining', 'Arme', 'Bizeps-Variation mit neutralem Griff', 'Kurzhanteln mit neutralem Griff heben'],
            ['Trizeps Dips', 'Krafttraining', 'Arme', 'Übung für den Trizeps', 'Körper an Stangen oder Bank nach unten und oben bewegen'],
            ['Trizepsdrücken', 'Krafttraining', 'Arme', 'Isolationsübung für den Trizeps', 'Hantel oder Kabel über Kopf nach unten drücken'],

            // Core exercises
            ['Plank', 'Krafttraining', 'Core', 'Statische Übung für die Rumpfmuskulatur', 'In Liegestützposition halten'],
            ['Crunches', 'Krafttraining', 'Core', 'Bauchmuskelübung', 'Oberkörper kontrolliert zu den Knien führen'],
            ['Russian Twists', 'Krafttraining', 'Core', 'Übung für die seitlichen Bauchmuskeln', 'Sitzend Oberkörper seitlich rotieren'],
            ['Mountain Climbers', 'Krafttraining', 'Core', 'Dynamische Core-Übung', 'Aus Plank-Position Knie abwechselnd zur Brust'],

            // Cardio exercises
            ['Laufband', 'Cardio', 'Cardio', 'Ausdauertraining', 'Gleichmäßiges Laufen auf dem Laufband'],
            ['Fahrrad', 'Cardio', 'Cardio', 'Ausdauertraining', 'Cardio-Training auf dem Ergometer'],
            ['Ellipsentrainer', 'Cardio', 'Cardio', 'Gelenkschonendes Cardio', 'Ganzkörper-Cardio-Training'],
            ['Rudergerät', 'Cardio', 'Cardio', 'Ganzkörper-Cardio', 'Ruder-Bewegung für Ausdauer und Kraft'],

            // Functional Training
            ['Burpees', 'Functional', 'Ganzkörper', 'Explosive Ganzkörperübung', 'Kombination aus Liegestütz, Sprung und Streckung'],
            ['Kettlebell Swings', 'Functional', 'Ganzkörper', 'Explosive Hüftbewegung mit Kettlebell', 'Kettlebell zwischen den Beinen schwingen'],
            ['Box Jumps', 'Functional', 'Beine', 'Explosive Sprungkraft', 'Auf erhöhte Plattform springen']
        ];
        
        db.get('SELECT COUNT(*) as count FROM exercises', (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (result.count === 0) {
                const stmt = db.prepare('INSERT INTO exercises (name, category, muscle_group, description, instructions) VALUES (?, ?, ?, ?, ?)');
                
                let completed = 0;
                exercises.forEach(exercise => {
                    stmt.run(exercise, (err) => {
                        completed++;
                        if (completed === exercises.length) {
                            stmt.finalize((err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    console.log('✅ Default exercises inserted');
                                    resolve();
                                }
                            });
                        }
                    });
                });
            } else {
                console.log('✅ Default exercises already exist');
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
        return res.status(401).json({ error: 'No token provided' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            console.error('JWT verification failed:', err);
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Admin middleware
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// Validation helpers
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password && password.length >= 6;
}

// Auth routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        db.get(
            'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1',
            [username, username],
            async (err, user) => {
                if (err) {
                    console.error('Login database error:', err);
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
                        { 
                            id: user.id, 
                            username: user.username, 
                            role: user.role,
                            email: user.email
                        },
                        process.env.JWT_SECRET || 'your-secret-key',
                        { expiresIn: '24h' }
                    );
                    
                    // Update last login
                    db.run('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
                    
                    res.json({
                        token,
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            role: user.role,
                            first_name: user.first_name,
                            last_name: user.last_name
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
        const { username, email, password, first_name, last_name } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email and password are required' });
        }
        
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        
        if (!validatePassword(password)) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);
        
        db.run(
            'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
            [username.trim(), email.trim().toLowerCase(), hashedPassword, first_name?.trim() || null, last_name?.trim() || null],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        if (err.message.includes('username')) {
                            res.status(409).json({ error: 'Username already exists' });
                        } else if (err.message.includes('email')) {
                            res.status(409).json({ error: 'Email already exists' });
                        } else {
                            res.status(409).json({ error: 'Username or email already exists' });
                        }
                    } else {
                        console.error('Registration error:', err);
                        res.status(500).json({ error: 'Internal server error' });
                    }
                } else {
                    console.log(`New user registered: ${username} (${email})`);
                    res.status(201).json({ message: 'User created successfully', userId: this.lastID });
                }
            }
        );
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin routes
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    db.all(
        'SELECT id, username, email, first_name, last_name, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC',
        (err, users) => {
            if (err) {
                console.error('Get users error:', err);
                res.status(500).json({ error: 'Internal server error' });
            } else {
                res.json(users);
            }
        }
    );
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
    const stats = {};
    
    db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Internal server error' });
        }
        stats.totalUsers = result.count;
        
        db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1', (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Internal server error' });
            }
            stats.activeUsers = result.count;
            
            db.get('SELECT COUNT(*) as count FROM workouts', (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Internal server error' });
                }
                stats.totalWorkouts = result.count;
                
                res.json(stats);
            });
        });
    });
});

app.post('/api/admin/users/:userId/reset-password', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { newPassword } = req.body;
        
        if (!newPassword || !validatePassword(newPassword)) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        db.run(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, userId],
            function(err) {
                if (err) {
                    console.error('Password reset error:', err);
                    res.status(500).json({ error: 'Internal server error' });
                } else if (this.changes === 0) {
                    res.status(404).json({ error: 'User not found' });
                } else {
                    console.log(`Password reset for user ID: ${userId} by admin: ${req.user.username}`);
                    res.json({ message: 'Password reset successfully' });
                }
            }
        );
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/admin/users/:userId/status', authenticateToken, requireAdmin, (req, res) => {
    const { userId } = req.params;
    const { is_active } = req.body;
    
    if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active must be a boolean' });
    }
    
    db.run(
        'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [is_active ? 1 : 0, userId],
        function(err) {
            if (err) {
                console.error('Update user status error:', err);
                res.status(500).json({ error: 'Internal server error' });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'User not found' });
            } else {
                console.log(`User ${userId} ${is_active ? 'activated' : 'deactivated'} by admin: ${req.user.username}`);
                res.json({ message: 'User status updated' });
            }
        }
    );
});

app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, (req, res) => {
    const { userId } = req.params;
    
    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    db.run(
        'DELETE FROM users WHERE id = ?',
        [userId],
        function(err) {
            if (err) {
                console.error('Delete user error:', err);
                res.status(500).json({ error: 'Internal server error' });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'User not found' });
            } else {
                console.log(`User ${userId} deleted by admin: ${req.user.username}`);
                res.json({ message: 'User deleted successfully' });
            }
        }
    );
});

// Exercise routes
app.get('/api/exercises', authenticateToken, (req, res) => {
    db.all('SELECT * FROM exercises ORDER BY category, name', (err, exercises) => {
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
        'INSERT INTO exercises (name, category, muscle_group, description, instructions, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [name.trim(), category.trim(), muscle_group.trim(), description?.trim() || null, instructions?.trim() || null, req.user.id],
        function(err) {
            if (err) {
                console.error('Create exercise error:', err);
                res.status(500).json({ error: 'Internal server error' });
            } else {
                console.log(`Exercise created: ${name} by user: ${req.user.username}`);
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
        'SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, created_at DESC',
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
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    db.run(
        'INSERT INTO workouts (user_id, name, date, duration_minutes, notes) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, name.trim(), date, duration_minutes || null, notes?.trim() || null],
        function(err) {
            if (err) {
                console.error('Create workout error:', err);
                res.status(500).json({ error: 'Internal server error' });
            } else {
                const workoutId = this.lastID;
                
                // Add exercises to workout if provided
                if (exercises && Array.isArray(exercises) && exercises.length > 0) {
                    const stmt = db.prepare(
                        'INSERT INTO workout_exercises (workout_id, exercise_id, sets_count, reps, weights, rest_time, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
                    );
                    
                    let completedInserts = 0;
                    const exerciseErrors = [];
                    
                    exercises.forEach((exercise, index) => {
                        const repsJson = JSON.stringify(exercise.reps || []);
                        const weightsJson = JSON.stringify(exercise.weights || []);
                        
                        stmt.run([
                            workoutId,
                            exercise.exercise_id,
                            exercise.sets_count || 1,
                            repsJson,
                            weightsJson,
                            exercise.rest_time || null,
                            exercise.notes?.trim() || null
                        ], (err) => {
                            completedInserts++;
                            if (err) {
                                exerciseErrors.push(`Exercise ${index + 1}: ${err.message}`);
                            }
                            
                            if (completedInserts === exercises.length) {
                                stmt.finalize();
                                if (exerciseErrors.length > 0) {
                                    console.error('Some exercises failed to save:', exerciseErrors);
                                }
                            }
                        });
                    });
                }
                
                console.log(`Workout created: ${name} by user: ${req.user.username}`);
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
                // Get exercises for this workout
                db.all(`
                    SELECT we.*, e.name as exercise_name, e.category, e.muscle_group
                    FROM workout_exercises we
                    JOIN exercises e ON we.exercise_id = e.id
                    WHERE we.workout_id = ?
                    ORDER BY we.id
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
    
    if (!name || !date) {
        return res.status(400).json({ error: 'Name and date are required' });
    }
    
    db.run(
        'UPDATE workouts SET name = ?, date = ?, duration_minutes = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [name.trim(), date, duration_minutes || null, notes?.trim() || null, req.params.id, req.user.id],
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
                console.log(`Workout ${req.params.id} deleted by user: ${req.user.username}`);
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
                        'SELECT SUM(duration_minutes) as total FROM workouts WHERE user_id = ? AND duration_minutes IS NOT NULL',
                        [userId],
                        (err, result) => {
                            if (err) {
                                console.error('Dashboard stats error:', err);
                                return res.status(500).json({ error: 'Internal server error' });
                            }
                            
                            stats.totalTime = result.total || 0;
                            
                            // Get recent workouts
                            db.all(
                                'SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 5',
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
        'SELECT id, username, email, role, first_name, last_name, created_at, updated_at FROM users WHERE id = ?',
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
    const { username, email, first_name, last_name } = req.body;
    
    if (!username || !email) {
        return res.status(400).json({ error: 'Username and email are required' });
    }
    
    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    
    db.run(
        'UPDATE users SET username = ?, email = ?, first_name = ?, last_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [username.trim(), email.trim().toLowerCase(), first_name?.trim() || null, last_name?.trim() || null, req.user.id],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    if (err.message.includes('username')) {
                        res.status(409).json({ error: 'Username already exists' });
                    } else if (err.message.includes('email')) {
                        res.status(409).json({ error: 'Email already exists' });
                    } else {
                        res.status(409).json({ error: 'Username or email already exists' });
                    }
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
    
    if (!validatePassword(newPassword)) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
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
                'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [hashedNewPassword, req.user.id],
                function(err) {
                    if (err) {
                        console.error('Update password error:', err);
                        res.status(500).json({ error: 'Internal server error' });
                    } else {
                        console.log(`Password changed for user: ${req.user.username}`);
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
    db.get('SELECT 1 as test', (err) => {
        if (err) {
            res.status(500).json({ 
                status: 'error', 
                message: 'Database connection failed',
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                database: 'SQLite',
                version: process.version,
                uptime: process.uptime()
            });
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// Serve the frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('❌ Error closing database:', err.message);
        } else {
            console.log('✅ Database connection closed.');
        }
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('❌ Error closing database:', err.message);
        } else {
            console.log('✅ Database connection closed.');
        }
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start server
app.listen(PORT, () => {
    console.log('🏋️‍♂️ =======================================');
    console.log('🏋️‍♀️ GYM TRACKER SERVER STARTED');
    console.log('🏋️‍♂️ =======================================');
    console.log(`📱 Server: http://localhost:${PORT}`);
    console.log(`💾 Database: ${DB_PATH}`);
    console.log(`🔐 Default Admin: admin/admin123`);
    console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? '✅ Configured' : '⚠️  Using default (not secure!)'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('🏋️‍♂️ =======================================');
});
