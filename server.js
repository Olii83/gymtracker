const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Optional security middlewares (only used if installed)
let helmet = null;
let rateLimit = null;
try { helmet = require('helmet'); } catch (_) {}
try { rateLimit = require('express-rate-limit'); } catch (_) {}

const app = express();
const PORT = process.env.PORT || 3000;

// Enforce secure JWT secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: Missing JWT_SECRET environment variable. Set a strong secret in .env');
  process.exit(1);
}

// Database path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database', 'gym_tracker.db');
const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Trust proxy when behind reverse proxy
if (String(process.env.TRUST_PROXY).toLowerCase() === 'true') {
  app.set('trust proxy', 1);
}

// Security and parsers
if (helmet) app.use(helmet());
app.use(express.json({ limit: process.env.MAX_BODY_SIZE || '1mb' }));

// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
if (allowedOrigins.length) {
  app.use(cors({ origin: allowedOrigins, credentials: true }));
} else {
  app.use(cors()); // fallback in dev
}

// Basic rate limiting (only if dependency is available)
if (rateLimit) {
  const limiter = rateLimit({ windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 });
  app.use(limiter);
}

// Static assets
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Fehler beim Verbinden mit der Datenbank:', err.message);
    process.exit(1);
  } else {
    console.log('Erfolgreich mit der SQLite-Datenbank verbunden');
    initDatabase();
  }
});

db.exec('PRAGMA foreign_keys = ON;');

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDatabase() {
  try {
    await runAsync(`
      CREATE TABLE IF NOT EXISTS users (
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
      );
    `);

    await runAsync(`
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
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name VARCHAR(255),
        date DATE NOT NULL,
        duration_minutes INTEGER,
        notes TEXT,
        workout_type VARCHAR(50),
        rating INTEGER CHECK (rating BETWEEN 1 AND 5),
        is_template BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await runAsync(`
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
        rest_time INTEGER DEFAULT 90,
        notes TEXT,
        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
      );
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS template_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        exercise_order INTEGER,
        suggested_sets INTEGER,
        suggested_reps TEXT,
        suggested_weight TEXT,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
      );
    `);

    // Optional seed
    if (String(process.env.SEED_DB).toLowerCase() === 'true') {
      console.log('Seeding database with default data...');
      const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
      const adminUser = process.env.ADMIN_USERNAME || 'admin';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
      const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
      const hash = await bcrypt.hash(adminPass, rounds);
      await runAsync(
        'INSERT OR IGNORE INTO users (id, username, email, password_hash, role) VALUES (1, ?, ?, ?, ?)',
        [adminUser, adminEmail, hash, 'admin']
      );

      await runAsync(
        `INSERT OR IGNORE INTO exercises (id, name, category, muscle_group, description) VALUES
         (1, 'Bankdrücken', 'Krafttraining', 'Brust', 'Grundübung für die Brustmuskulatur'),
         (2, 'Kreuzheben', 'Krafttraining', 'Rücken', 'Ganzkörperübung für den unteren Rücken'),
         (3, 'Kniebeugen', 'Krafttraining', 'Beine', 'Grundübung für die Beinmuskulatur'),
         (4, 'Laufband', 'Cardio', 'Ganzkörper', 'Ausdauertraining auf dem Laufband');`
      );

      await runAsync(
        `INSERT OR IGNORE INTO workouts (id, user_id, name, date, duration_minutes, notes) VALUES
         (1, 1, 'Erstes Training', '2025-01-01', 45, 'Ein guter Start!');`
      );

      await runAsync(
        `INSERT OR IGNORE INTO workout_exercises (id, workout_id, exercise_id, exercise_order, sets_count, reps, weights) VALUES
         (1, 1, 1, 1, 3, '["10","8","6"]', '["50","55","60"]');`
      );
    }

    console.log('Datenbankschema bereit.');
  } catch (err) {
    console.error('Fehler bei der DB-Initialisierung:', err);
    process.exit(1);
  }
}

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Kein Token bereitgestellt' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Ungültiger Token' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
  }
  next();
}

const TOKEN_TTL = process.env.SESSION_TIMEOUT || '1h';

// Health check
app.get('/api/health', (req, res) => {
  db.get('SELECT 1 as ok', (err) => {
    if (err) return res.status(500).json({ status: 'error', error: 'DB Fehler' });
    res.json({ status: 'ok', time: new Date().toISOString() });
  });
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Alle Felder müssen ausgefüllt sein' });
  }
  try {
    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, rounds);
    const result = await runAsync('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, passwordHash]);
    const token = jwt.sign({ id: result.lastID, username, role: 'user' }, JWT_SECRET, { expiresIn: TOKEN_TTL });
    res.status(201).json({ message: 'Benutzer erfolgreich registriert', token, user: { id: result.lastID, username, email, role: 'user' } });
  } catch (err) {
    if (String(err.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Benutzername oder E-Mail bereits vergeben' });
    }
    console.error('Registrierungsfehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
  }
  try {
    const user = await getAsync('SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1', [username, username]);
    if (!user) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
    const userData = { id: user.id, username: user.username, email: user.email, role: user.role };
    res.json({ message: 'Login erfolgreich', token, user: userData });
  } catch (err) {
    console.error('Login-Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.post('/api/auth/verify-token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token fehlt' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getAsync('SELECT id, username, email, role FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ isValid: false, message: 'Benutzer nicht gefunden' });
    res.json({ isValid: true, user });
  } catch (err) {
    console.error('Token-Verifizierungsfehler:', err);
    res.status(401).json({ isValid: false, message: 'Ungültiger Token' });
  }
});

// User profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await getAsync('SELECT id, username, email, role, first_name, last_name, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    res.json(user);
  } catch (err) {
    console.error('Profil-Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  const { username, email, first_name, last_name } = req.body;
  try {
    await runAsync('UPDATE users SET username = ?, email = ?, first_name = ?, last_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [username, email, first_name || null, last_name || null, req.user.id]);
    const updated = await getAsync('SELECT id, username, email, role, first_name, last_name FROM users WHERE id = ?', [req.user.id]);
    res.json(updated);
  } catch (err) {
    if (String(err.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Benutzername oder E-Mail bereits vergeben' });
    }
    console.error('Profil-Update-Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.put('/api/user/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Passwörter erforderlich' });
  try {
    const user = await getAsync('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const newHash = await bcrypt.hash(newPassword, rounds);
    await runAsync('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, req.user.id]);
    res.json({ message: 'Passwort erfolgreich geändert' });
  } catch (err) {
    console.error('Passwort-Änderungsfehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.get('/api/user/export', authenticateToken, async (req, res) => {
  try {
    const [user, workouts, exercises, workoutExercises] = await Promise.all([
      getAsync('SELECT id, username, email, role, first_name, last_name, created_at FROM users WHERE id = ?', [req.user.id]),
      allAsync('SELECT * FROM workouts WHERE user_id = ?', [req.user.id]),
      allAsync('SELECT * FROM exercises WHERE created_by = ? OR is_public = 1', [req.user.id]),
      allAsync(`SELECT we.* FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id WHERE w.user_id = ?`, [req.user.id])
    ]);
    res.json({ user, workouts, exercises, workoutExercises });
  } catch (err) {
    console.error('Export-Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Exercises
app.get('/api/exercises', authenticateToken, async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM exercises');
    res.json(rows);
  } catch (err) {
    console.error('Übungen-Ladefehler:', err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Übungen' });
  }
});

app.post('/api/exercises', authenticateToken, async (req, res) => {
  const { name, category, muscle_group, description, instructions, difficulty_level, equipment } = req.body;
  if (!name || !category || !muscle_group) return res.status(400).json({ error: 'Name, Kategorie und Muskelgruppe sind erforderlich' });
  try {
    const result = await runAsync(
      'INSERT INTO exercises (name, category, muscle_group, description, instructions, difficulty_level, equipment, created_by, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
      [name, category, muscle_group, description || null, instructions || null, difficulty_level || 1, equipment || null, req.user.id]
    );
    const created = await getAsync('SELECT * FROM exercises WHERE id = ?', [result.lastID]);
    res.status(201).json(created);
  } catch (err) {
    console.error('Übung-Erstellungsfehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.put('/api/exercises/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  const { name, category, muscle_group, description, instructions, difficulty_level, equipment } = req.body;
  try {
    await runAsync(
      'UPDATE exercises SET name = ?, category = ?, muscle_group = ?, description = ?, instructions = ?, difficulty_level = ?, equipment = ? WHERE id = ?',
      [name, category, muscle_group, description || null, instructions || null, difficulty_level || 1, equipment || null, id]
    );
    const updated = await getAsync('SELECT * FROM exercises WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    console.error('Übung-Update-Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.delete('/api/exercises/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await runAsync('DELETE FROM exercises WHERE id = ?', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Übung-Löschfehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Workouts
app.get('/api/workouts', authenticateToken, async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC', [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error('Workouts-Ladefehler:', err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Workouts' });
  }
});

app.post('/api/workouts', authenticateToken, async (req, res) => {
  const { name, date, duration_minutes, notes, workout_type, rating, exercises } = req.body;
  if (!date) return res.status(400).json({ error: 'Datum ist erforderlich' });
  try {
    const result = await runAsync('INSERT INTO workouts (user_id, name, date, duration_minutes, notes, workout_type, rating) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.user.id, name || null, date, duration_minutes || null, notes || null, workout_type || null, rating || null]);
    const workoutId = result.lastID;

    if (Array.isArray(exercises) && exercises.length) {
      // Insert workout exercises
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        await runAsync(
          'INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets_count, reps, weights, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            workoutId,
            ex.id || ex.exercise_id,
            i + 1,
            ex.sets_count || null,
            ex.reps ? JSON.stringify(ex.reps) : null,
            ex.weights ? JSON.stringify(ex.weights) : null,
            ex.notes || null
          ]
        );
      }
    }

    const created = await getAsync('SELECT * FROM workouts WHERE id = ?', [workoutId]);
    res.status(201).json(created);
  } catch (err) {
    console.error('Workout-Erstellungsfehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.put('/api/workouts/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  const { name, date, duration_minutes, notes, workout_type, rating, exercises } = req.body;
  try {
    await runAsync('UPDATE workouts SET name = ?, date = ?, duration_minutes = ?, notes = ?, workout_type = ?, rating = ? WHERE id = ? AND user_id = ?', [name || null, date, duration_minutes || null, notes || null, workout_type || null, rating || null, id, req.user.id]);

    if (Array.isArray(exercises)) {
      await runAsync('DELETE FROM workout_exercises WHERE workout_id = ?', [id]);
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        await runAsync(
          'INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets_count, reps, weights, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            id,
            ex.id || ex.exercise_id,
            i + 1,
            ex.sets_count || null,
            ex.reps ? JSON.stringify(ex.reps) : null,
            ex.weights ? JSON.stringify(ex.weights) : null,
            ex.notes || null
          ]
        );
      }
    }

    const updated = await getAsync('SELECT * FROM workouts WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json(updated || {});
  } catch (err) {
    console.error('Workout-Update-Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.delete('/api/workouts/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await runAsync('DELETE FROM workouts WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.status(204).send();
  } catch (err) {
    console.error('Workout-Löschfehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Templates
app.get('/api/templates', authenticateToken, async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM templates WHERE user_id = ?', [req.user.id]);
    // Attach exercises for each template
    const withExercises = await Promise.all(rows.map(async (t) => {
      const ex = await allAsync('SELECT * FROM template_exercises WHERE template_id = ?', [t.id]);
      return { ...t, exercises: ex };
    }));
    res.json(withExercises);
  } catch (err) {
    console.error('Templates-Ladefehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.post('/api/templates', authenticateToken, async (req, res) => {
  const { name, description, category, exercises } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });
  try {
    const result = await runAsync('INSERT INTO templates (user_id, name, description, category) VALUES (?, ?, ?, ?)', [req.user.id, name, description || null, category || null]);
    const templateId = result.lastID;
    if (Array.isArray(exercises)) {
      for (const [idx, ex] of exercises.entries()) {
        await runAsync(
          'INSERT INTO template_exercises (template_id, exercise_id, exercise_order, suggested_sets, suggested_reps, suggested_weight) VALUES (?, ?, ?, ?, ?, ?)',
          [templateId, ex.exercise_id, ex.exercise_order || idx + 1, ex.suggested_sets || null, JSON.stringify(ex.suggested_reps || null), JSON.stringify(ex.suggested_weight || null)]
        );
      }
    }
    const created = await getAsync('SELECT * FROM templates WHERE id = ?', [templateId]);
    res.status(201).json(created);
  } catch (err) {
    console.error('Template-Erstellungsfehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.delete('/api/templates/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await runAsync('DELETE FROM templates WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.status(204).send();
  } catch (err) {
    console.error('Template-Löschfehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Admin endpoints
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await allAsync('SELECT id, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) {
    console.error('Admin Users Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = (await getAsync('SELECT COUNT(*) as c FROM users')).c;
    const activeUsers = (await getAsync('SELECT COUNT(*) as c FROM users WHERE is_active = 1')).c;
    const totalWorkouts = (await getAsync('SELECT COUNT(*) as c FROM workouts')).c;
    const newUsersLast30Days = (await getAsync('SELECT COUNT(*) as c FROM users WHERE created_at >= date("now", "-30 days")')).c;
    res.json({ totalUsers, activeUsers, totalWorkouts, newUsersLast30Days });
  } catch (err) {
    console.error('Admin Stats Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.put('/api/admin/users/:id/password', authenticateToken, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'Neues Passwort ist erforderlich' });
  try {
    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const hash = await bcrypt.hash(newPassword, rounds);
    await runAsync('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hash, id]);
    res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
  } catch (err) {
    console.error('Admin Passwort-Reset Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await runAsync('DELETE FROM users WHERE id = ?', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Admin Benutzer-Lösch Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.post('/api/admin/maintenance', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    await runAsync('VACUUM;');
    await runAsync('ANALYZE;');
    res.json({ message: 'Wartung abgeschlossen' });
  } catch (err) {
    console.error('Maintenance Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.post('/api/admin/backup', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    // Simple backup copy (same directory) with timestamp
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = DB_PATH.replace(/\.db$/, `-${ts}.db`);
    fs.copyFileSync(DB_PATH, backupFile);
    res.json({ message: 'Backup erstellt', filename: path.basename(backupFile) });
  } catch (err) {
    console.error('Backup Fehler:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const totalWorkouts = (await getAsync('SELECT COUNT(*) as c FROM workouts WHERE user_id = ?', [userId])).c;
    const thisWeekWorkouts = (await getAsync('SELECT COUNT(*) as c FROM workouts WHERE user_id = ? AND date >= date("now", "-7 days")', [userId])).c;
    const totalTime = (await getAsync('SELECT SUM(duration_minutes) as s FROM workouts WHERE user_id = ?', [userId])).s || 0;
    const recentWorkouts = await allAsync('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC LIMIT 5', [userId]);
    res.json({ totalWorkouts, thisWeekWorkouts, totalTime, recentWorkouts });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Serve frontend
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
