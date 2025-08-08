-- Gym Tracker Database Schema
CREATE DATABASE IF NOT EXISTS gym_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gym_tracker;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email verification tokens
CREATE TABLE email_verification_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Exercise categories
CREATE TABLE exercise_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exercises
CREATE TABLE exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category_id INT,
    is_public BOOLEAN DEFAULT FALSE,
    weight_type ENUM('kg', 'lbs', 'none') DEFAULT 'kg',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES exercise_categories(id) ON DELETE SET NULL
);

-- Workouts
CREATE TABLE workouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Workout sessions
CREATE TABLE workout_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    workout_id INT,
    name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE SET NULL
);

-- Workout exercises (exercises in a workout template)
CREATE TABLE workout_exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workout_id INT NOT NULL,
    exercise_id INT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    target_sets INT DEFAULT 3,
    target_reps INT DEFAULT 10,
    target_weight DECIMAL(8,2) DEFAULT 0,
    rest_time INT DEFAULT 120,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

-- Session exercises (actual exercises performed in a session)
CREATE TABLE session_exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    exercise_id INT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

-- Sets (actual sets performed)
CREATE TABLE sets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_exercise_id INT NOT NULL,
    set_number INT NOT NULL,
    weight DECIMAL(8,2) DEFAULT 0,
    reps INT NOT NULL,
    rpe INT DEFAULT NULL,
    performance ENUM('better', 'same', 'worse') DEFAULT 'same',
    completed BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_exercise_id) REFERENCES session_exercises(id) ON DELETE CASCADE
);

-- Personal records
CREATE TABLE personal_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    exercise_id INT NOT NULL,
    weight DECIMAL(8,2) DEFAULT 0,
    reps INT NOT NULL,
    date_achieved DATE NOT NULL,
    session_id INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_exercise_weight_reps (user_id, exercise_id, weight, reps)
);

-- Settings
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Admin users
CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- User sessions
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default exercise categories
INSERT INTO exercise_categories (name, description) VALUES
('Chest', 'Chest exercises'),
('Back', 'Back exercises'),
('Shoulders', 'Shoulder exercises'),
('Arms', 'Arm exercises (biceps, triceps)'),
('Legs', 'Leg exercises'),
('Core', 'Core and abdominal exercises'),
('Cardio', 'Cardiovascular exercises'),
('Other', 'Other exercises');

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, description) VALUES
('smtp_host', '', 'SMTP server hostname'),
('smtp_port', '587', 'SMTP server port'),
('smtp_username', '', 'SMTP username'),
('smtp_password', '', 'SMTP password'),
('smtp_encryption', 'tls', 'SMTP encryption (tls, ssl, none)'),
('from_email', 'noreply@gym.zhst.eu', 'From email address'),
('from_name', 'Gym Tracker', 'From name'),
('site_name', 'Gym Tracker', 'Site name'),
('site_url', 'https://gym.zhst.eu', 'Site URL'),
('registration_enabled', '1', 'Enable user registration'),
('email_verification_required', '0', 'Require email verification'),
('password_reset_token_expiry', '3600', 'Password reset token expiry in seconds'),
('session_timeout', '86400', 'Session timeout in seconds');

-- Insert default admin user (password: admin123 - change this!)
INSERT INTO admin_users (username, email, password_hash, role) VALUES
('admin', 'admin@gym.zhst.eu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin');

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_start_time ON workout_sessions(start_time);
CREATE INDEX idx_sets_session_exercise_id ON sets(session_exercise_id);
CREATE INDEX idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);