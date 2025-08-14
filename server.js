const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const DB_PATH = path.join(__dirname, 'gym_tracker.db');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Fehler beim Verbinden mit der Datenbank:', err.message);
    } else {
        console.log('Erfolgreich mit der SQLite-Datenbank verbunden');
        db.exec(
            `
            PRAGMA foreign_keys = ON;
            
            -- Users table
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Exercises table
            CREATE TABLE IF NOT EXISTS exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) NOT NULL,
                muscle_group VARCHAR(50) NOT NULL,
                description TEXT,
                instructions TEXT,
                difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
                equipment VARCHAR(100),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                is_public BOOLEAN DEFAULT 1,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            );

            -- Workouts table
            CREATE TABLE IF NOT EXISTS workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name VARCHAR(255),
                date DATE NOT NULL,
                duration_minutes INTEGER,
                notes TEXT,
                workout_type VARCHAR(50),
                rating INTEGER CHECK (rating BETWEEN 1 AND 5),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            -- Workout_Exercises table (joining workouts and exercises)
            CREATE TABLE IF NOT EXISTS workout_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                exercise_order INTEGER,
                sets_count INTEGER,
                reps TEXT,
                weights TEXT,
                distance REAL,
                duration_seconds INTEGER,
                rest_time INTEGER,
                notes TEXT,
                FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
            );

            -- Templates table
            CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(50),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            -- Template_Exercises table
            CREATE TABLE IF NOT EXISTS template_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                exercise_order INTEGER,
                suggested_sets INTEGER,
                suggested_reps INTEGER,
                suggested_weight REAL,
                FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
            );

            -- Initial sample exercises (for demonstration)
            INSERT OR IGNORE INTO exercises (id, name, category, muscle_group, description) VALUES
            (1, 'Bankdrücken', 'Krafttraining', 'Brust', 'Grundübung für die Brustmuskulatur'),
            (2, 'Kreuzheben', 'Krafttraining', 'Rücken', 'Ganzkörperübung für den unteren Rücken'),
            (3, 'Kniebeugen', 'Krafttraining', 'Beine', 'Grundübung für die Beinmuskulatur'),
            (4, 'Laufband', 'Cardio', 'Ganzkörper', 'Ausdauertraining auf dem Laufband');

            -- Create a default admin user if not exists
            INSERT OR IGNORE INTO users (id, username, email, password_hash, role) VALUES (1, 'admin', 'admin@example.com', '$2b$10$T1K72Lp0z.E2D.5B7vO5pOu0x7g/rXl0g.1a.l4Cj9v.2h8i5x7u', 'admin');
            
            -- Sample workout for the admin user
            INSERT OR IGNORE INTO workouts (user_id, name, date, duration_minutes, notes) VALUES
            (1, 'Erstes Training', '2025-01-01', 45, 'Ein guter Start!');
            
            -- Sample workout exercise for the admin user
            INSERT OR IGNORE INTO workout_exercises (workout_id, exercise_id, exercise_order, sets_count, reps, weights) VALUES
            (1, 1, 1, 3, '["10", "8", "6"]', '["50", "55", "60"]');

            `, (err) => {
                if (err) {
                    console.error('Fehler beim Erstellen der Tabellen:', err.message);
                } else {
                    console.log('Datenbanktabellen erstellt oder existieren bereits.');
                }
            }
        );
    }
});


// Middleware zur Authentifizierung von Anfragen
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ error: 'Kein Token bereitgestellt' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Ungültiger Token' });
        }
        req.user = user;
        next();
    });
};

// API-Endpunkte für die Authentifizierung
// Registrierung
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Alle Felder müssen ausgefüllt sein' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, passwordHash],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ error: 'Benutzername oder E-Mail bereits vergeben' });
                    }
                    console.error('Registrierungsfehler:', err.message);
                    return res.status(500).json({ error: 'Ein Fehler ist aufgetreten' });
                }
                const token = jwt.sign({ id: this.lastID, username, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
                res.status(201).json({ message: 'Benutzer erfolgreich registriert', token });
            }
        );
    } catch (error) {
        console.error('Fehler beim Hashing des Passworts:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
    }

    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], async (err, user) => {
        if (err) {
            console.error('Login-Fehler:', err.message);
            return res.status(500).json({ error: 'Ein Fehler ist aufgetreten' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
        }

        try {
            const match = await bcrypt.compare(password, user.password_hash);
            if (!match) {
                return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
            }

            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
            const userData = { id: user.id, username: user.username, email: user.email, role: user.role };
            res.status(200).json({ message: 'Login erfolgreich', token, user: userData });
        } catch (error) {
            console.error('Fehler beim Vergleich des Passworts:', error);
            res.status(500).json({ error: 'Interner Serverfehler' });
        }
    });
});

// API-Endpunkt zur Token-Verifizierung (neu hinzugefügt)
app.post('/api/auth/verify-token', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token fehlt' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id, username, email, role FROM users WHERE id = ?', [decoded.id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!user) {
            return res.status(401).json({ isValid: false, message: 'Benutzer nicht gefunden' });
        }

        res.status(200).json({ isValid: true, user });
    } catch (error) {
        console.error('Token-Verifizierungsfehler:', error);
        res.status(401).json({ isValid: false, message: 'Ungültiger Token' });
    }
});


// Geschützte Routen (nur für authentifizierte Benutzer)
app.get('/api/user/profile', authenticateToken, (req, res) => {
    res.status(200).json({ message: `Willkommen, ${req.user.username}!`, user: req.user });
});

app.get('/api/exercises', authenticateToken, (req, res) => {
    db.all('SELECT * FROM exercises', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Abrufen der Übungen' });
        }
        res.status(200).json(rows);
    });
});

app.get('/api/workouts', authenticateToken, (req, res) => {
    db.all('SELECT * FROM workouts WHERE user_id = ?', [req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Abrufen der Workouts' });
        }
        res.status(200).json(rows);
    });
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
