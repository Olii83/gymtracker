-- Gym Tracker Database Schema (SQLite)
-- Version: 1.0
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

-- Create indexes for exercise searches
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);

-- Workouts table for training sessions
CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    duration_minutes INTEGER,
    notes TEXT,
    workout_type VARCHAR(50) DEFAULT 'strength',
    location VARCHAR(100),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for workout queries
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);

-- Workout exercises table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    exercise_order INTEGER DEFAULT 1,
    sets_count INTEGER NOT NULL DEFAULT 1,
    reps TEXT, -- JSON array: [12, 10, 8]
    weights TEXT, -- JSON array: [50, 55, 60]
    distance REAL, -- For cardio exercises (km)
    duration_seconds INTEGER, -- For time-based exercises
    rest_time INTEGER, -- Rest time in seconds
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

-- Create indexes for workout exercise queries
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    preferred_units VARCHAR(10) DEFAULT 'metric', -- metric or imperial
    default_rest_time INTEGER DEFAULT 90, -- seconds
    privacy_settings TEXT, -- JSON object
    notification_settings TEXT, -- JSON object
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'de',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Body measurements table for progress tracking
CREATE TABLE IF NOT EXISTS body_measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    measurement_date DATE NOT NULL,
    weight REAL, -- kg
    body_fat_percentage REAL,
    muscle_mass REAL, -- kg
    height REAL, -- cm
    chest REAL, -- cm
    waist REAL, -- cm
    hips REAL, -- cm
    bicep_left REAL, -- cm
    bicep_right REAL, -- cm
    thigh_left REAL, -- cm
    thigh_right REAL, -- cm
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for measurements
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, measurement_date);

-- Personal records table
CREATE TABLE IF NOT EXISTS personal_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    record_type VARCHAR(20) NOT NULL, -- '1RM', 'volume', 'reps', 'time'
    value REAL NOT NULL,
    unit VARCHAR(10), -- 'kg', 'lbs', 'seconds', 'minutes'
    reps INTEGER, -- For rep-based records
    date_achieved DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    UNIQUE(user_id, exercise_id, record_type)
);

-- Create index for personal records
CREATE INDEX IF NOT EXISTS idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);

-- Workout templates table
CREATE TABLE IF NOT EXISTS workout_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    estimated_duration INTEGER, -- minutes
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    is_public BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Template exercises table
CREATE TABLE IF NOT EXISTS template_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    exercise_order INTEGER DEFAULT 1,
    suggested_sets INTEGER DEFAULT 3,
    suggested_reps TEXT, -- JSON array
    suggested_weight REAL,
    suggested_rest_time INTEGER,
    notes TEXT,
    FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_workouts_timestamp 
AFTER UPDATE ON workouts
BEGIN
    UPDATE workouts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_user_preferences_timestamp 
AFTER UPDATE ON user_preferences
BEGIN
    UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_workout_templates_timestamp 
AFTER UPDATE ON workout_templates
BEGIN
    UPDATE workout_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Insert default exercises
INSERT OR IGNORE INTO exercises (name, category, muscle_group, description, instructions, difficulty_level, equipment) VALUES
-- Chest exercises
('Bankdrücken', 'Krafttraining', 'Brust', 'Grundübung für die Brustmuskulatur', 'Flach auf die Bank legen, Langhantel greifen und kontrolliert zur Brust führen', 2, 'Langhantel, Bank'),
('Schrägbankdrücken', 'Krafttraining', 'Brust', 'Bankdrücken auf der Schrägbank für obere Brust', 'Bank auf 30-45° einstellen, Langhantel kontrolliert zur oberen Brust führen', 3, 'Langhantel, Schrägbank'),
('Kurzhantel Bankdrücken', 'Krafttraining', 'Brust', 'Bankdrücken mit Kurzhanteln', 'Mit Kurzhanteln für größeren Bewegungsumfang', 2, 'Kurzhanteln, Bank'),
('Fliegende', 'Krafttraining', 'Brust', 'Isolationsübung für die Brust', 'Mit Kurzhanteln bogenförmige Bewegung zur Brustmitte', 2, 'Kurzhanteln, Bank'),
('Liegestütze', 'Krafttraining', 'Brust', 'Körpergewichtsübung für Brust und Arme', 'Körperspannung halten, kontrolliert nach unten und oben', 1, 'Körpergewicht'),

-- Back exercises
('Kreuzheben', 'Krafttraining', 'Rücken', 'Grundübung für den gesamten Körper', 'Langhantel vom Boden kontrolliert nach oben ziehen', 4, 'Langhantel'),
('Klimmzüge', 'Krafttraining', 'Rücken', 'Übung für den Latissimus und Bizeps', 'An der Stange hängen und sich nach oben ziehen', 3, 'Klimmzugstange'),
('Langhantelrudern', 'Krafttraining', 'Rücken', 'Horizontales Ziehen für den Rücken', 'Langhantel horizontal zum Körper ziehen', 3, 'Langhantel'),
('Kurzhantelrudern', 'Krafttraining', 'Rücken', 'Einarmiges Rudern mit Kurzhantel', 'Einseitig mit Abstützung auf Bank', 2, 'Kurzhantel, Bank'),
('Latzug', 'Krafttraining', 'Rücken', 'Vertikales Ziehen am Kabelzug', 'Griff über Kopf nach unten ziehen', 2, 'Latzugmaschine'),

-- Leg exercises
('Kniebeugen', 'Krafttraining', 'Beine', 'Grundübung für die Beinmuskulatur', 'Aufrecht stehen, in die Hocke gehen und wieder aufrichten', 2, 'Langhantel, Squat Rack'),
('Beinpresse', 'Krafttraining', 'Beine', 'Maschinenübung für Quadrizeps und Gesäß', 'Plattform mit den Beinen wegdrücken', 2, 'Beinpresse'),
('Ausfallschritte', 'Krafttraining', 'Beine', 'Unilaterale Beinübung', 'Schritt nach vorn, Knie beugen und zurück', 2, 'Kurzhanteln'),
('Beincurls', 'Krafttraining', 'Beine', 'Isolationsübung für Beinbeuger', 'Liegend Fersen zum Gesäß führen', 1, 'Beincurl-Maschine'),
('Beinstrecker', 'Krafttraining', 'Beine', 'Isolationsübung für Quadrizeps', 'Sitzend Unterschenkel strecken', 1, 'Beinstrecker-Maschine'),
('Wadenheben', 'Krafttraining', 'Beine', 'Übung für die Wadenmuskulatur', 'Auf Zehenspitzen stellen und senken', 1, 'Kurzhanteln'),

-- Shoulder exercises
('Schulterdrücken', 'Krafttraining', 'Schultern', 'Übung für die Schultermuskulatur', 'Hantel oder Langhantel über den Kopf drücken', 2, 'Langhantel'),
('Seitheben', 'Krafttraining', 'Schultern', 'Isolationsübung für seitliche Schulter', 'Kurzhanteln seitlich bis Schulterhöhe heben', 2, 'Kurzhanteln'),
('Frontheben', 'Krafttraining', 'Schultern', 'Isolationsübung für vordere Schulter', 'Kurzhanteln nach vorn bis Schulterhöhe heben', 2, 'Kurzhanteln'),
('Reverse Flys', 'Krafttraining', 'Schultern', 'Übung für hintere Schulter', 'Gebeugt Arme nach hinten führen', 2, 'Kurzhanteln'),

-- Arm exercises
('Bizeps Curls', 'Krafttraining', 'Arme', 'Isolationsübung für den Bizeps', 'Hantel kontrolliert zum Körper führen', 1, 'Kurzhanteln'),
('Hammer Curls', 'Krafttraining', 'Arme', 'Bizeps-Variation mit neutralem Griff', 'Kurzhanteln mit neutralem Griff heben', 1, 'Kurzhanteln'),
('Trizeps Dips', 'Krafttraining', 'Arme', 'Übung für den Trizeps', 'Körper an Stangen oder Bank nach unten und oben bewegen', 2, 'Dip-Stangen/Bank'),
('Trizepsdrücken', 'Krafttraining', 'Arme', 'Isolationsübung für den Trizeps', 'Hantel oder Kabel über Kopf nach unten drücken', 2, 'Kurzhanteln/Kabel'),
('Enge Liegestütze', 'Krafttraining', 'Arme', 'Trizeps-fokussierte Liegestütze', 'Hände eng zusammen, Fokus auf Trizeps', 2, 'Körpergewicht'),

-- Core exercises
('Plank', 'Krafttraining', 'Core', 'Statische Übung für die Rumpfmuskulatur', 'In Liegestützposition halten', 1, 'Körpergewicht'),
('Crunches', 'Krafttraining', 'Core', 'Bauchmuskelübung', 'Oberkörper kontrolliert zu den Knien führen', 1, 'Körpergewicht'),
('Russian Twists', 'Krafttraining', 'Core', 'Übung für die seitlichen Bauchmuskeln', 'Sitzend Oberkörper seitlich rotieren', 2, 'Medizinball'),
('Mountain Climbers', 'Krafttraining', 'Core', 'Dynamische Core-Übung', 'Aus Plank-Position Knie abwechselnd zur Brust', 2, 'Körpergewicht'),
('Dead Bug', 'Krafttraining', 'Core', 'Core-Stabilisation in Rückenlage', 'Rückenlage, gegenläufige Arm-Bein-Bewegung', 2, 'Körpergewicht'),

-- Cardio exercises
('Laufband', 'Cardio', 'Cardio', 'Ausdauertraining', 'Gleichmäßiges Laufen auf dem Laufband', 1, 'Laufband'),
('Fahrrad', 'Cardio', 'Cardio', 'Ausdauertraining', 'Cardio-Training auf dem Ergometer', 1, 'Ergometer'),
('Ellipsentrainer', 'Cardio', 'Cardio', 'Gelenkschonendes Cardio', 'Ganzkörper-Cardio-Training', 1, 'Ellipsentrainer'),
('Rudergerät', 'Cardio', 'Cardio', 'Ganzkörper-Cardio', 'Ruder-Bewegung für Ausdauer und Kraft', 2, 'Rudergerät'),
('Stepper', 'Cardio', 'Cardio', 'Step-Cardio-Training', 'Treppen-Simulation für Beine und Cardio', 1, 'Stepper'),

-- Functional Training
('Burpees', 'Functional', 'Ganzkörper', 'Explosive Ganzkörperübung', 'Kombination aus Liegestütz, Sprung und Streckung', 3, 'Körpergewicht'),
('Kettlebell Swings', 'Functional', 'Ganzkörper', 'Explosive Hüftbewegung mit Kettlebell', 'Kettlebell zwischen den Beinen schwingen', 3, 'Kettlebell'),
('Thrusters', 'Functional', 'Ganzkörper', 'Kombination aus Kniebeuge und Schulterdrücken', 'Kniebeuge in Schulterdrücken überführen', 3, 'Kurzhanteln'),
('Turkish Get-Up', 'Functional', 'Ganzkörper', 'Komplexe Ganzkörperbewegung', 'Vom Liegen zum Stehen mit Gewicht über Kopf', 4, 'Kettlebell'),
('Box Jumps', 'Functional', 'Beine', 'Explosive Sprungkraft', 'Auf erhöhte Plattform springen', 2, 'Sprungbox'),
('Battle Ropes', 'Functional', 'Ganzkörper', 'Hochintensives Seil-Training', 'Seile in verschiedenen Mustern schwingen', 3, 'Battle Ropes'),

-- Stretching/Mobility
('Katze-Kuh Stretch', 'Stretching', 'Rücken', 'Mobilisation der Wirbelsäule', 'Vierfüßlerstand, Wirbelsäule runden und strecken', 1, 'Körpergewicht'),
('Kinderpose', 'Stretching', 'Rücken', 'Entspannungsposition', 'Kniend nach hinten setzen, Arme ausstrecken', 1, 'Körpergewicht'),
('Piriformis Stretch', 'Stretching', 'Beine', 'Dehnung des Piriformis-Muskels', 'Liegend Bein über andere Seite kreuzen', 1, 'Körpergewicht'),
('Shoulder Rolls', 'Stretching', 'Schultern', 'Schulter-Mobilisation', 'Schultern kreisend vor und zurück', 1, 'Körpergewicht'),
('Hip Circles', 'Stretching', 'Beine', 'Hüft-Mobilisation', 'Hüfte in kreisenden Bewegungen', 1, 'Körpergewicht');

-- Create a default admin user (password: admin123)
-- Note: In production, this should be changed immediately
INSERT OR IGNORE INTO users (username, email, password_hash, role, first_name, last_name) VALUES 
('admin', 'admin@gym.zhst.eu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeGMmy.vr9zV5Ep4K', 'admin', 'Admin', 'User');

-- Create default user preferences for admin
INSERT OR IGNORE INTO user_preferences (user_id, preferred_units, default_rest_time, theme, language) VALUES 
(1, 'metric', 90, 'light', 'de');

-- Create some sample workout templates
INSERT OR IGNORE INTO workout_templates (user_id, name, description, category, estimated_duration, difficulty_level, is_public) VALUES
(1, 'Push-Tag (Brust/Schultern/Trizeps)', 'Fokus auf drückende Bewegungen', 'Krafttraining', 60, 3, 1),
(1, 'Pull-Tag (Rücken/Bizeps)', 'Fokus auf ziehende Bewegungen', 'Krafttraining', 60, 3, 1),
(1, 'Bein-Tag', 'Komplettes Beintraining', 'Krafttraining', 75, 4, 1),
(1, 'Ganzkörper Beginner', 'Einsteiger-freundliches Ganzkörpertraining', 'Krafttraining', 45, 2, 1),
(1, 'HIIT Cardio', 'Hochintensives Intervalltraining', 'Cardio', 30, 3, 1);

-- Sample template exercises for Push-Tag
INSERT OR IGNORE INTO template_exercises (template_id, exercise_id, exercise_order, suggested_sets, suggested_reps, suggested_rest_time) VALUES
(1, 1, 1, 4, '[8,8,8,8]', 180), -- Bankdrücken
(1, 8, 2, 3, '[10,10,10]', 120), -- Schulterdrücken  
(1, 9, 3, 3, '[12,12,12]', 90), -- Seitheben
(1, 14, 4, 3, '[12,12,12]', 90), -- Trizepsdrücken
(1, 13, 5, 3, '[10,10,10]', 90); -- Trizeps Dips

-- Sample template exercises for Pull-Tag
INSERT OR IGNORE INTO template_exercises (template_id, exercise_id, exercise_order, suggested_sets, suggested_reps, suggested_rest_time) VALUES
(2, 7, 1, 4, '[6,6,6,6]', 180), -- Klimmzüge
(2, 6, 2, 4, '[8,8,8,8]', 150), -- Kreuzheben
(2, 8, 3, 3, '[10,10,10]', 120), -- Langhantelrudern
(2, 12, 4, 3, '[12,12,12]', 90), -- Bizeps Curls
(2, 13, 5, 3, '[12,12,12]', 90); -- Hammer Curls

-- Create views for common queries
CREATE VIEW IF NOT EXISTS workout_summary AS
SELECT 
    w.id,
    w.user_id,
    w.name,
    w.date,
    w.duration_minutes,
    COUNT(we.id) as exercise_count,
    w.rating,
    w.created_at
FROM workouts w
LEFT JOIN workout_exercises we ON w.id = we.workout_id
GROUP BY w.id;

CREATE VIEW IF NOT EXISTS exercise_usage AS
SELECT 
    e.id,
    e.name,
    e.category,
    e.muscle_group,
    COUNT(we.id) as usage_count,
    AVG(CASE 
        WHEN we.weights IS NOT NULL AND we.weights != '[]' 
        THEN (SELECT AVG(CAST(value AS REAL)) FROM json_each(we.weights))
        ELSE NULL 
    END) as avg_weight
FROM exercises e
LEFT JOIN workout_exercises we ON e.id = we.exercise_id
GROUP BY e.id;

CREATE VIEW IF NOT EXISTS user_stats AS
SELECT 
    u.id,
    u.username,
    COUNT(DISTINCT w.id) as total_workouts,
    COUNT(DISTINCT DATE(w.date)) as workout_days,
    SUM(w.duration_minutes) as total_minutes,
    AVG(w.duration_minutes) as avg_workout_duration,
    MAX(w.date) as last_workout_date,
    COUNT(DISTINCT we.exercise_id) as unique_exercises_performed
FROM users u
LEFT JOIN workouts w ON u.id = w.user_id
LEFT JOIN workout_exercises we ON w.id = we.workout_id
GROUP BY u.id;

-- Insert some sample data for demonstration (optional)
-- This can be removed in production

-- Sample workout for admin user
INSERT OR IGNORE INTO workouts (user_id, name, date, duration_minutes, notes, workout_type, rating) VALUES
(1, 'Erstes Training', '2025-01-01', 45, 'Guter Start ins neue Jahr!', 'strength', 4);

-- Sample workout exercises
INSERT OR IGNORE INTO workout_exercises (workout_id, exercise_id, exercise_order, sets_count, reps, weights, rest_time) VALUES
(1, 1, 1, 3, '[10,8,6]', '[50,55,60]', 120), -- Bankdrücken
(1, 6, 2, 3, '[8,8,8]', '[80,80,80]', 180), -- Kniebeugen
(1, 12, 3, 3, '[12,12,12]', '[15,15,15]', 90); -- Bizeps Curls

-- Sample body measurement
INSERT OR IGNORE INTO body_measurements (user_id, measurement_date, weight, height) VALUES
(1, '2025-01-01', 80.0, 180.0);

-- Sample personal record
INSERT OR IGNORE INTO personal_records (user_id, exercise_id, record_type, value, unit, reps, date_achieved) VALUES
(1, 1, '1RM', 100.0, 'kg', 1, '2025-01-01');

-- Optimization: Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workouts_user_id_date_desc ON workouts(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_exercise ON workout_exercises(workout_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_user_exercise_type ON personal_records(user_id, exercise_id, record_type);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date_desc ON body_measurements(user_id, measurement_date DESC);

-- Final optimization settings
PRAGMA optimize;
VACUUM;
ANALYZE;