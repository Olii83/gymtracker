
CREATE DATABASE gym_tracker;

USE gym_tracker;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    isAdmin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users (email);

CREATE TABLE password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens (token);

CREATE TABLE exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    weight_type ENUM("kg", "lbs", "kein Gewicht") NOT NULL DEFAULT "kg",
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_exercises_user_id_name ON exercises (user_id, name);

CREATE TABLE workouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_workouts_user_date ON workouts (user_id, date);

CREATE TABLE workout_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workout_id INT NOT NULL,
    exercise_id INT NOT NULL,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_workout_entries_workout_exercise ON workout_entries (workout_id, exercise_id);

CREATE TABLE sets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workout_entry_id INT NOT NULL,
    set_number INT NOT NULL,
    weight DECIMAL(10, 2) NOT NULL,
    reps INT NOT NULL,
    performance_status ENUM("up", "down", "same") DEFAULT "same",
    last_weight DECIMAL(10, 2) DEFAULT NULL,
    last_reps INT DEFAULT NULL,
    FOREIGN KEY (workout_entry_id) REFERENCES workout_entries(id) ON DELETE CASCADE
);

CREATE INDEX idx_sets_workout_entry ON sets (workout_entry_id, set_number);

CREATE TABLE personal_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    exercise_id INT NOT NULL,
    weight DECIMAL(10, 2) NOT NULL,
    reps INT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_pr_user_exercise ON personal_records (user_id, exercise_id);

