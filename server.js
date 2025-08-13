// Gym Tracker Server - Bereinigte Version
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

// Middleware-Konfiguration
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// SQLite-Datenbank initialisieren
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Datenbankfehler:', err.message);
        process.exit(1);
    }
    console.log('Mit SQLite-Datenbank verbunden');
    initDatabase();
});

// Foreign Keys aktivieren
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Initialisiert die Datenbank
 */
async function initDatabase() {
    try {
        await createTables();
        await createDefaultAdmin();
        await insertDefaultExercises();
        console.log('✅ Datenbank-Initialisierung abgeschlossen');
    } catch (error) {
        console.error('❌ Datenbank-Initialisierung fehlgeschlagen:', error);
        process.exit(1);
    }
}

/**
 * Erstellt Datenbanktabellen
 */
function createTables() {
    return new Promise((resolve, reject) => {
        const tables = [
            // Benutzertabelle
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
            
            // Übungstabelle
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
            
            // Trainingstabelle
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
            
            // Trainingsübungen-Tabelle
            `CREATE TABLE IF NOT EXISTS workout_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                sets_count INTEGER NOT NULL DEFAULT 1,
                reps TEXT,
                weights TEXT,
                rest_time INTEGER DEFAULT 90,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
            )`,
            
            // Indizes für bessere Performance
            `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
            `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
            `CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date)`,
            `CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id)`,
            `CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category)`,
            `CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group)`,
            
            // Trigger für updated_at
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
                    console.error(`Fehler beim Erstellen von Tabelle/Index ${index}:`, err);
                    errors.push(err);
                }
                completed++;
                
                if (completed === tables.length) {
                    if (errors.length > 0) {
                        reject(new Error(`Fehler beim Erstellen einiger Tabellen: ${errors.length} Fehler`));
                    } else {
                        console.log('Datenbankschema erfolgreich erstellt/verifiziert');
                        resolve();
                    }
                }
            });
        });
    });
}

/**
 * Erstellt Standard-Admin-Benutzer
 */
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
                                console.log('✅ Standard-Admin-Benutzer erstellt: admin/admin123');
                                resolve();
                            }
                        }
                    );
                } catch (error) {
                    reject(error);
                }
            } else {
                console.log('✅ Standard-Admin-Benutzer bereits vorhanden');
                resolve();
            }
        });
    });
}

/**
 * Fügt Standard-Übungen ein
 */
function insertDefaultExercises() {
    return new Promise((resolve, reject) => {
        const exercises = [
            // Brust-Übungen
            ['Bankdrücken', 'Krafttraining', 'Brust', 'Grundübung für die Brustmuskulatur', 'Kontrolliert zur Brust führen'],
            ['Schrägbankdrücken', 'Krafttraining', 'Brust', 'Bankdrücken auf der Schrägbank', 'Bank auf 30-45° einstellen'],
            ['Kurzhantel Bankdrücken', 'Krafttraining', 'Brust', 'Bankdrücken mit Kurzhanteln', 'Größerer Bewegungsumfang'],
            ['Fliegende', 'Krafttraining', 'Brust', 'Isolationsübung für die Brust', 'Bogenförmige Bewegung zur Brustmitte'],
            ['Liegestütze', 'Krafttraining', 'Brust', 'Körpergewichtsübung', 'Körperspannung halten'],

            // Rücken-Übungen
            ['Kreuzheben', 'Krafttraining', 'Rücken', 'Grundübung für den gesamten Körper', 'Langhantel vom Boden nach oben ziehen'],
            ['Klimmzüge', 'Krafttraining', 'Rücken', 'Übung für Latissimus und Bizeps', 'An der Stange nach oben ziehen'],
            ['Langhantelrudern', 'Krafttraining', 'Rücken', 'Horizontales Ziehen', 'Langhantel horizontal zum Körper ziehen'],
            ['Kurzhantelrudern', 'Krafttraining', 'Rücken', 'Einarmiges Rudern', 'Einseitig mit Abstützung auf Bank'],
            ['Latzug', 'Krafttraining', 'Rücken', 'Vertikales Ziehen am Kabelzug', 'Griff über Kopf nach unten ziehen'],

            // Bein-Übungen
            ['Kniebeugen', 'Krafttraining', 'Beine', 'Grundübung für die Beinmuskulatur', 'Aufrecht stehen, in die Hocke gehen'],
            ['Beinpresse', 'Krafttraining', 'Beine', 'Maschinenübung', 'Plattform mit den Beinen wegdrücken'],
            ['Ausfallschritte', 'Krafttraining', 'Beine', 'Unilaterale Beinübung', 'Schritt nach vorn, Knie beugen'],
            ['Beincurls', 'Krafttraining', 'Beine', 'Isolationsübung für Beinbeuger', 'Fersen zum Gesäß führen'],
            ['Beinstrecker', 'Krafttraining', 'Beine', 'Isolationsübung für Quadrizeps', 'Unterschenkel strecken'],
            ['Wadenheben', 'Krafttraining', 'Beine', 'Übung für die Wadenmuskulatur', 'Auf Zehenspitzen stellen'],

            // Schulter-Übungen
            ['Schulterdrücken', 'Krafttraining', 'Schultern', 'Übung für die Schultermuskulatur', 'Hantel über den Kopf drücken'],
            ['Seitheben', 'Krafttraining', 'Schultern', 'Isolationsübung seitliche Schulter', 'Kurzhanteln seitlich heben'],
            ['Frontheben', 'Krafttraining', 'Schultern', 'Isolationsübung vordere Schulter', 'Kurzhanteln nach vorn heben'],
            ['Reverse Flys', 'Krafttraining', 'Schultern', 'Übung für hintere Schulter', 'Arme nach hinten führen'],

            // Arm-Übungen
            ['Bizeps Curls', 'Krafttraining', 'Arme', 'Isolationsübung für den Bizeps', 'Hantel zum Körper führen'],
            ['Hammer Curls', 'Krafttraining', 'Arme', 'Bizeps-Variation mit neutralem Griff', 'Kurzhanteln neutral heben'],
            ['Trizeps Dips', 'Krafttraining', 'Arme', 'Übung für den Trizeps', 'Körper nach unten und oben bewegen'],
            ['Trizepsdrücken', 'Krafttraining', 'Arme', 'Isolationsübung für den Trizeps', 'Hantel über Kopf drücken'],

            // Core-Übungen
            ['Plank', 'Krafttraining', 'Core', 'Statische Rumpfübung', 'In Liegestützposition halten'],
            ['Crunches', 'Krafttraining', 'Core', 'Bauchmuskelübung', 'Oberkörper zu den Knien führen'],
            ['Russian Twists', 'Krafttraining', 'Core', 'Übung für seitliche Bauchmuskeln', 'Oberkörper seitlich rotieren'],
            ['Mountain Climbers', 'Krafttraining', 'Core', 'Dynamische Core-Übung', 'Knie abwechselnd zur Brust'],

            // Cardio-Übungen
            ['Laufband', 'Cardio', 'Cardio', 'Ausdauertraining', 'Gleichmäßiges Laufen'],
            ['Fahrrad', 'Cardio', 'Cardio', 'Ausdauertraining', 'Cardio-Training auf dem Ergometer'],
            ['Ellipsentrainer', 'Cardio', 'Cardio', 'Gelenkschonendes Cardio', 'Ganzkörper-Cardio-Training'],
            ['Rudergerät', 'Cardio', 'Cardio', 'Ganzkörper-Cardio', 'Ruder-Bewegung für Ausdauer'],

            // Functional Training
            ['Burpees', 'Functional', 'Ganzkörper', 'Explosive Ganzkörperübung', 'Kombination aus Liegestütz und Sprung'],
            ['Kettlebell Swings', 'Functional', 'Ganzkörper', 'Explosive Hüftbewegung', 'Kettlebell zwischen den Beinen schwingen'],
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
                                    console.log('✅ Standard-Übungen eingefügt');
                                    resolve();
                                }
                            });
                        }
                    });
                });
            } else {
                console.log('✅ Standard-Übungen bereits vorhanden');
                resolve();
            }
        });
    });
}

/**
 * JWT-Middleware für Authentifizierung
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Kein Token bereitgestellt' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            console.error('JWT-Verifizierung fehlgeschlagen:', err);
            return res.status(403).json({ error: 'Ungültiger oder abgelaufener Token' });
        }
        req.user = user;
        next();
    });
}

/**
 * Admin-Middleware
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin-Zugriff erforderlich' });
    }
    next();
}

/**
 * Validierungs-Hilfsfunktionen
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password && password.length >= 6;
}

// ===== AUTHENTIFIZIERUNGS-ROUTEN =====

/**
 * Login-Route
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
        }
        
        db.get(
            'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1',
            [username, username],
            async (err, user) => {
                if (err) {
                    console.error('Login-Datenbankfehler:', err);
                    return res.status(500).json({ error: 'Interner Serverfehler' });
                }
                
                if (!user) {
                    return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
                }
                
                try {
                    const validPassword = await bcrypt.compare(password, user.password_hash);
                    
                    if (!validPassword) {
                        return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
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
                    
                    // Letzten Login aktualisieren
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
                    console.error('Bcrypt-Fehler:', bcryptError);
                    res.status(500).json({ error: 'Interner Serverfehler' });
                }
            }
        );
    } catch (error) {
        console.error('Login-Fehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * Registrierungs-Route
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, first_name, last_name } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Benutzername, E-Mail und Passwort sind erforderlich' });
        }
        
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Ungültiges E-Mail-Format' });
        }
        
        if (!validatePassword(password)) {
            return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);
        
        db.run(
            'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
            [username.trim(), email.trim().toLowerCase(), hashedPassword, first_name?.trim() || null, last_name?.trim() || null],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        if (err.message.includes('username')) {
                            res.status(409).json({ error: 'Benutzername bereits vorhanden' });
                        } else if (err.message.includes('email')) {
                            res.status(409).json({ error: 'E-Mail bereits vorhanden' });
                        } else {
                            res.status(409).json({ error: 'Benutzername oder E-Mail bereits vorhanden' });
                        }
                    } else {
                        console.error('Registrierungsfehler:', err);
                        res.status(500).json({ error: 'Interner Serverfehler' });
                    }
                } else {
                    console.log(`Neuer Benutzer registriert: ${username} (${email})`);
                    res.status(201).json({ message: 'Benutzer erfolgreich erstellt', userId: this.lastID });
                }
            }
        );
    } catch (error) {
        console.error('Registrierungsfehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// ===== ADMIN-ROUTEN =====

/**
 * Alle Benutzer abrufen (Admin)
 */
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    db.all(
        'SELECT id, username, email, first_name, last_name, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC',
        (err, users) => {
            if (err) {
                console.error('Benutzer abrufen Fehler:', err);
                res.status(500).json({ error: 'Interner Serverfehler' });
            } else {
                res.json(users);
            }
        }
    );
});

/**
 * Admin-Statistiken abrufen
 */
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
    const stats = {};
    
    db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }
        stats.totalUsers = result.count;
        
        db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1', (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Interner Serverfehler' });
            }
            stats.activeUsers = result.count;
            
            db.get('SELECT COUNT(*) as count FROM workouts', (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Interner Serverfehler' });
                }
                stats.totalWorkouts = result.count;
                
                res.json(stats);
            });
        });
    });
});

/**
 * Benutzerpasswort zurücksetzen (Admin)
 */
app.post('/api/admin/users/:userId/reset-password', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { newPassword } = req.body;
        
        if (!newPassword || !validatePassword(newPassword)) {
            return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        db.run(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, userId],
            function(err) {
                if (err) {
                    console.error('Passwort-Zurücksetzungsfehler:', err);
                    res.status(500).json({ error: 'Interner Serverfehler' });
                } else if (this.changes === 0) {
                    res.status(404).json({ error: 'Benutzer nicht gefunden' });
                } else {
                    console.log(`Passwort zurückgesetzt für Benutzer-ID: ${userId} von Admin: ${req.user.username}`);
                    res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
                }
            }
        );
    } catch (error) {
        console.error('Passwort-Zurücksetzungsfehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * Benutzerstatus ändern (Admin)
 */
app.put('/api/admin/users/:userId/status', authenticateToken, requireAdmin, (req, res) => {
    const { userId } = req.params;
    const { is_active } = req.body;
    
    if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active muss ein Boolean sein' });
    }
    
    db.run(
        'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [is_active ? 1 : 0, userId],
        function(err) {
            if (err) {
                console.error('Benutzerstatus-Update-Fehler:', err);
                res.status(500).json({ error: 'Interner Serverfehler' });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Benutzer nicht gefunden' });
            } else {
                console.log(`Benutzer ${userId} ${is_active ? 'aktiviert' : 'deaktiviert'} von Admin: ${req.user.username}`);
                res.json({ message: 'Benutzerstatus aktualisiert' });
            }
        }
    );
});

/**
 * Benutzer löschen (Admin)
 */
app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, (req, res) => {
    const { userId } = req.params;
    
    // Verhindern, dass Admin sich selbst löscht
    if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'Sie können Ihr eigenes Konto nicht löschen' });
    }
    
    db.run(
        'DELETE FROM users WHERE id = ?',
        [userId],
        function(err) {
            if (err) {
                console.error('Benutzer-Löschfehler:', err);
                res.status(500).json({ error: 'Interner Serverfehler' });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Benutzer nicht gefunden' });
            } else {
                console.log(`Benutzer ${userId} gelöscht von Admin: ${req.user.username}`);
                res.json({ message: 'Benutzer erfolgreich gelöscht' });
            }
        }
    );
});

// ===== ÜB