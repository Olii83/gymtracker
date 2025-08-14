-- Gym Tracker Database Schema (SQLite)
-- Version: 1.1
-- Created: 2025

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    date_of_birth DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Exercises table with comprehensive exercise database
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

-- Workouts table for tracking workout sessions
CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    duration_minutes INTEGER,
    notes TEXT,
    workout_type VARCHAR(50) DEFAULT 'strength', -- Spalte hinzugefügt für den Trainingstyp (z.B. Kraft, Cardio)
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    is_template BOOLEAN DEFAULT 0, -- Spalte hinzugefügt, um Workouts als Vorlage zu markieren
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Workout exercises table (junction table)
CREATE TABLE IF NOT EXISTS workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    exercise_order INTEGER NOT NULL,
    sets_count INTEGER,
    reps TEXT, -- Hinzugefügt, um Arrays von Wiederholungen als JSON-String zu speichern
    weights TEXT, -- Hinzugefügt, um Arrays von Gewichten als JSON-String zu speichern
    distance REAL, -- Hinzugefügt für Cardio-Übungen
    duration_seconds INTEGER, -- Hinzugefügt für Cardio-Übungen
    rest_time INTEGER DEFAULT 90,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

-- Body measurements table for tracking progress
CREATE TABLE IF NOT EXISTS body_measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    measurement_date DATE NOT NULL,
    weight REAL,
    height REAL,
    body_fat REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Personal records table for tracking bests
CREATE TABLE IF NOT EXISTS personal_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    record_type VARCHAR(50),
    value REAL NOT NULL,
    unit VARCHAR(10) NOT NULL,
    reps INTEGER,
    date_achieved DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    UNIQUE (user_id, exercise_id, record_type) ON CONFLICT REPLACE
);

-- Optimization: Create additional indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_id ON body_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_user_id ON personal_records(user_id);

-- Sample data for quick start (to be removed in production)
INSERT OR IGNORE INTO users (id, username, email, password_hash, role) VALUES
(1, 'admin', 'admin@example.com', '$2b$10$gE3l... (example hash)', 'admin');

-- Sample workout for admin user
INSERT OR IGNORE INTO workouts (user_id, name, date, duration_minutes, notes, workout_type, rating, is_template) VALUES
(1, 'Erstes Training', '2025-01-01', 45, 'Guter Start ins neue Jahr!', 'strength', 4, 0);

-- Sample workout exercises
INSERT OR IGNORE INTO workout_exercises (workout_id, exercise_id, exercise_order, sets_count, reps, weights, rest_time) VALUES
(1, 1, 1, 3, '[10,8,6]', '[50,55,60]', 120), -- Bench Press
(1, 6, 2, 3, '[8,8,8]', '[80,80,80]', 180), -- Squats
(1, 12, 3, 3, '[12,12,12]', '[15,15,15]', 90); -- Bicep Curls

-- Sample body measurement
INSERT OR IGNORE INTO body_measurements (user_id, measurement_date, weight, height) VALUES
(1, '2025-01-01', 80.0, 180.0);

-- Sample personal record
INSERT OR IGNORE INTO personal_records (user_id, exercise_id, record_type, value, unit, reps, date_achieved) VALUES
(1, 1, '1RM', 100.0, 'kg', 1, '2025-01-01');

-- Sample data for the 'templates' table
-- Templates are now just workouts with is_template=1
INSERT OR IGNORE INTO workouts (user_id, name, date, duration_minutes, notes, workout_type, is_template) VALUES
(1, 'Ganzkörper-Vorlage', '2025-01-01', NULL, 'Schnelle Ganzkörper-Routine', 'strength', 1);

INSERT OR IGNORE INTO workout_exercises (workout_id, exercise_id, exercise_order, sets_count, reps, weights, rest_time) VALUES
((SELECT id FROM workouts WHERE is_template = 1 AND name = 'Ganzkörper-Vorlage'), 1, 1, 3, '[10,10,10]', '[40,40,40]', 90),
((SELECT id FROM workouts WHERE is_template = 1 AND name = 'Ganzkörper-Vorlage'), 2, 2, 3, '[10,10,10]', '[50,50,50]', 90),
((SELECT id FROM workouts WHERE is_template = 1 AND name = 'Ganzkörper-Vorlage'), 3, 3, 3, '[10,10,10]', '[60,60,60]', 90);

