await Utils.apiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            Utils.showAlert('Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success');
            this.showTab('login');
            document.getElementById('registerForm').reset();
        } catch (error) {
            Utils.showAlert(error.message, 'error');
        }
    },

    showTab(tab) {
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');
        
        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(f => f.classList.add('hidden'));
        
        document.querySelector(`.auth-tab:${tab === 'login' ? 'first' : 'last'}-child`).classList.add('active');
        document.getElementById(`${tab}Form`).classList.remove('hidden');
    },

    showMainApp() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        if (this.currentUser) {
            const displayName = this.currentUser.first_name && this.currentUser.last_name 
                ? `${this.currentUser.first_name} ${this.currentUser.last_name}`
                : this.currentUser.username;
            document.getElementById('userWelcome').textContent = `Willkommen, ${displayName}!`;
            
            if (this.currentUser.role === 'admin') {
                document.getElementById('adminButton').classList.remove('hidden');
            }
        }
    },

    logout() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
        this.showTab('login');
    },

    isAuthenticated() {
        return !!(this.authToken && this.currentUser);
    },

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }
};
EOF

    cat > "$TEMP_DIR/app.js" << 'EOF'
// Gym Tracker App - Minimal version
const App = {
    currentSection: 'dashboard',

    init() {
        console.log('Initializing Gym Tracker...');
        Auth.init();
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Dropdown functionality
        document.addEventListener('click', function(e) {
            if (e.target.closest('.dropdown-toggle')) {
                e.preventDefault();
                const dropdown = e.target.closest('.nav-dropdown');
                dropdown.querySelector('.dropdown-menu').classList.toggle('show');
            } else {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });
    },

    showSection(sectionName) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });
        
        document.getElementById(sectionName).classList.remove('hidden');
        this.currentSection = sectionName;
        
        switch(sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'admin':
                if (Auth.isAdmin()) {
                    this.loadAdmin();
                } else {
                    Utils.showAlert('Keine Berechtigung für Admin-Bereich', 'error');
                    this.showSection('dashboard');
                }
                break;
        }
    },

    async loadDashboard() {
        try {
            const stats = await Utils.apiCall('/dashboard/stats');
            
            if (stats) {
                document.getElementById('totalWorkouts').textContent = stats.totalWorkouts || 0;
                document.getElementById('thisWeekWorkouts').textContent = stats.thisWeekWorkouts || 0;
                document.getElementById('totalTime').textContent = stats.totalTime || 0;
                
                this.displayRecentWorkouts(stats.recentWorkouts || []);
            }
        } catch (error) {
            Utils.showAlert('Fehler beim Laden der Dashboard-Daten: ' + error.message, 'error');
        }
    },

    displayRecentWorkouts(workouts) {
        const container = document.getElementById('recentWorkouts');
        
        if (workouts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>🏃‍♀️ Noch keine Trainings vorhanden</p>
                    <button class="btn btn-success" onclick="App.showSection('newWorkout')">
                        ➕ Erstes Training erstellen
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = workouts.map(workout => `
            <div class="workout-item">
                <div class="workout-date">${Utils.formatDate(workout.date)}</div>
                <div class="workout-name">${workout.name}</div>
                <div class="workout-duration">
                    ${workout.duration_minutes ? `⏱️ ${workout.duration_minutes} Minuten` : '⏱️ Dauer nicht erfasst'}
                </div>
            </div>
        `).join('');
    },

    async loadAdmin() {
        const container = document.getElementById('adminContent');
        
        try {
            const [users, stats] = await Promise.all([
                Utils.apiCall('/admin/users'),
                Utils.apiCall('/admin/stats')
            ]);
            
            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card info">
                        <div class="stat-icon">👥</div>
                        <div class="stat-content">
                            <div class="stat-number">${stats.totalUsers || 0}</div>
                            <div class="stat-label">Registrierte Benutzer</div>
                        </div>
                    </div>
                    <div class="stat-card success">
                        <div class="stat-icon">✅</div>
                        <div class="stat-content">
                            <div class="stat-number">${stats.activeUsers || 0}</div>
                            <div class="stat-label">Aktive Benutzer</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">👥 Benutzerverwaltung</h2>
                    </div>
                    <div class="card-content">
                        <div class="table-container">
                            <table class="user-table">
                                <thead>
                                    <tr>
                                        <th>Benutzername</th>
                                        <th>E-Mail</th>
                                        <th>Rolle</th>
                                        <th>Status</th>
                                        <th>Registriert</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${users.map(user => `
                                        <tr>
                                            <td>${user.username}</td>
                                            <td>${user.email}</td>
                                            <td><span class="user-badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}">${user.role}</span></td>
                                            <td><span class="user-badge ${user.is_active ? 'badge-active' : 'badge-inactive'}">${user.is_active ? 'Aktiv' : 'Inaktiv'}</span></td>
                                            <td>${Utils.formatDate(user.created_at)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            container.innerHTML = `<div class="alert alert-error">Fehler beim Laden: ${error.message}</div>`;
        }
    },

    exportData() {
        Utils.showAlert('Export-Funktion wird entwickelt...', 'info');
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
EOF

    # Create placeholder files for other modules
    echo "// Workouts module - placeholder" > "$TEMP_DIR/workouts.js"
    echo "// Exercises module - placeholder" > "$TEMP_DIR/exercises.js"
    echo "// Admin module - placeholder" > "$TEMP_DIR/admin.js"
    
    # Copy JavaScript files
    sudo cp "$TEMP_DIR/"*.js "$APP_DIR/public/js/"
    
    print_success "JavaScript modules deployed"
}

# Deploy CSS
deploy_css() {
    print_status "Deploying CSS..."
    
    # Create a minimal but complete CSS file
    sudo tee "$APP_DIR/public/css/styles.css" > /dev/null << 'EOF'
/* Gym Tracker - Complete Styles */
:root {
    --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --primary-color: #667eea;
    --success-gradient: linear-gradient(45deg, #56ab2f, #a8e6cf);
    --success-color: #56ab2f;
    --danger-gradient: linear-gradient(45deg, #ff416c, #ff4b2b);
    --danger-color: #ff416c;
    --warning-gradient: linear-gradient(45deg, #f7971e, #ffd200);
    --info-gradient: linear-gradient(45deg, #17a2b8, #20c997);
    --admin-gradient: linear-gradient(45deg, #8E2DE2, #4A00E0);
    
    --white: #ffffff;
    --light-gray: #f8f9fa;
    --gray: #e9ecef;
    --dark-gray: #6c757d;
    --dark: #333333;
    
    --bg-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --bg-overlay: rgba(255, 255, 255, 0.95);
    --bg-card: rgba(255, 255, 255, 0.98);
    
    --shadow-lg: 0 8px 32px rgba(31, 38, 135, 0.37);
    --shadow-xl: 0 15px 35px rgba(31, 38, 135, 0.5);
    
    --radius-md: 10px;
    --radius-lg: 15px;
    --radius-xl: 20px;
    --radius-round: 25px;
    
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 32px;
    --space-2xl: 48px;
    
    --font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-size-sm: 14px;
    --font-size-base: 16px;
    --font-size-lg: 18px;
    --font-size-xl: 20px;
    --font-size-2xl: 24px;
    --font-size-3xl: 32px;
    
    --transition-normal: 0.3s ease;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    line-height: 1.6;
    color: var(--dark);
    background: var(--bg-gradient);
    min-height: 100vh;
}

.hidden {
    display: none !important;
}

/* Login Styles */
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: var(--space-lg);
}

.login-card {
    background: var(--bg-overlay);
    backdrop-filter: blur(15px);
    border-radius: var(--radius-xl);
    padding: var(--space-2xl);
    width: 100%;
    max-width: 450px;
    box-shadow: var(--shadow-xl);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.login-header {
    text-align: center;
    margin-bottom: var(--space-xl);
}

.login-title {
    font-size: var(--font-size-3xl);
    font-weight: 700;
    background: var(--primary-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: var(--space-sm);
}

.login-subtitle {
    color: var(--dark-gray);
    font-size: var(--font-size-base);
}

.auth-tabs {
    display: flex;
    margin-bottom: var(--space-xl);
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--light-gray);
    border: 2px solid var(--gray);
}

.auth-tab {
    flex: 1;
    padding: var(--space-md);
    font-size: var(--font-size-base);
    font-weight: 500;
    font-family: inherit;
    text-align: center;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all var(--transition-normal);
    color: var(--dark-gray);
}

.auth-tab.active {
    background: var(--primary-gradient);
    color: var(--white);
}

.auth-help {
    text-align: center;
    margin-top: var(--space-md);
    padding: var(--space-md);
    background: var(--light-gray);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--primary-color);
}

/* Header & Navigation */
.header {
    background: var(--bg-overlay);
    backdrop-filter: blur(10px);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    margin-bottom: var(--space-xl);
    box-shadow: var(--shadow-lg);
    border: 1px solid rgba(255, 255, 255, 0.18);
    position: sticky;
    top: var(--space-md);
    z-index: 100;
}

.nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-md);
}

.logo {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--primary-color);
}

.logo-text {
    background: var(--primary-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.user-welcome {
    font-size: var(--font-size-sm);
    color: var(--dark-gray);
    font-weight: 400;
    margin-left: var(--space-md);
}

.nav-buttons {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
    align-items: center;
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-lg);
    font-size: var(--font-size-sm);
    font-weight: 500;
    font-family: inherit;
    text-decoration: none;
    text-align: center;
    white-space: nowrap;
    cursor: pointer;
    border: none;
    border-radius: var(--radius-round);
    background: var(--primary-gradient);
    color: var(--white);
    transition: all var(--transition-normal);
}

.btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
}

.btn-primary { background: var(--primary-gradient); }
.btn-success { background: var(--success-gradient); }
.btn-danger { background: var(--danger-gradient); }
.btn-warning { background: var(--warning-gradient); }
.btn-info { background: var(--info-gradient); }
.btn-admin { background: var(--admin-gradient); }

.btn-outline {
    background: transparent;
    color: var(--primary-color);
    border: 2px solid var(--primary-color);
}

.btn-sm {
    padding: 4px 12px;
    font-size: var(--font-size-sm);
}

/* Dropdown */
.nav-dropdown {
    position: relative;
}

.dropdown-arrow {
    font-size: 12px;
    transition: transform 0.15s ease;
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--white);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    padding: var(--space-sm);
    min-width: 200px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.15s ease;
    z-index: 1000;
}

.dropdown-menu.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.dropdown-menu a {
    display: block;
    padding: var(--space-sm) var(--space-md);
    color: var(--dark);
    text-decoration: none;
    border-radius: 6px;
    transition: background-color 0.15s ease;
}

.dropdown-menu a:hover {
    background-color: var(--light-gray);
}

.dropdown-menu hr {
    margin: var(--space-sm) 0;
    border: none;
    border-top: 1px solid var(--gray);
}

.logout-link {
    color: var(--danger-color) !important;
}

/* Layout */
.main-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--space-lg);
}

/* Cards */
.card {
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
    margin-bottom: var(--space-lg);
    box-shadow: var(--shadow-lg);
    border: 1px solid rgba(255, 255, 255, 0.18);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-lg);
    padding-bottom: var(--space-md);
    border-bottom: 2px solid var(--gray);
}

.card-title {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--dark);
    margin: 0;
}

/* Sections */
.section-header {
    margin-bottom: var(--space-2xl);
    text-align: center;
}

.section-title {
    font-size: var(--font-size-3xl);
    font-weight: 700;
    color: var(--dark);
    margin-bottom: var(--space-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
}

.section-subtitle {
    font-size: var(--font-size-lg);
    color: var(--dark-gray);
}

/* Stats */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-lg);
    margin-bottom: var(--space-xl);
}

.stat-card {
    display: flex;
    align-items: center;
    gap: var(--space-lg);
    padding: var(--space-xl);
    border-radius: var(--radius-lg);
    background: var(--primary-gradient);
    color: var(--white);
    box-shadow: var(--shadow-lg);
    transition: transform var(--transition-normal);
}

.stat-card:hover {
    transform: translateY(-4px);
}

.stat-card.secondary { background: linear-gradient(45deg, #f093fb, #f5576c); }
.stat-card.success { background: var(--success-gradient); }
.stat-card.accent { background: var(--warning-gradient); }
.stat-card.info { background: var(--info-gradient); }

.stat-icon {
    font-size: var(--font-size-3xl);
    opacity: 0.9;
}

.stat-number {
    font-size: var(--font-size-3xl);
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 4px;
}

.stat-label {
    font-size: var(--font-size-sm);
    opacity: 0.9;
    font-weight: 500;
}

/* Forms */
.form-group {
    margin-bottom: var(--space-lg);
}

.form-group label {
    display: block;
    margin-bottom: var(--space-sm);
    font-weight: 500;
    color: #555;
    font-size: var(--font-size-sm);
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: var(--space-md);
    font-size: var(--font-size-base);
    font-family: inherit;
    color: var(--dark);
    background-color: var(--white);
    border: 2px solid var(--gray);
    border-radius: var(--radius-md);
    transition: border-color 0.15s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
}

/* Workouts */
.workouts-list {
    display: grid;
    gap: var(--space-md);
}

.workout-item {
    background: var(--light-gray);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
    border-left: 4px solid var(--primary-color);
    transition: all var(--transition-normal);
    cursor: pointer;
}

.workout-item:hover {
    background: var(--white);
    transform: translateX(8px) translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    border-left-color: var(--success-color);
}

.workout-date {
    font-weight: 600;
    color: var(--primary-color);
    font-size: var(--font-size-sm);
    margin-bottom: 4px;
}

.workout-name {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--dark);
    margin-bottom: var(--space-sm);
}

.workout-duration {
    color: var(--dark-gray);
    font-size: var(--font-size-sm);
}

/* Tables */
.table-container {
    overflow-x: auto;
    border-radius: var(--radius-md);
    border: 1px solid var(--gray);
}

.user-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--white);
}

.user-table th,
.user-table td {
    padding: var(--space-md);
    text-align: left;
    border-bottom: 1px solid var(--gray);
    vertical-align: middle;
}

.user-table th {
    background: var(--primary-color);
    color: var(--white);
    font-weight: 600;
    font-size: var(--font-size-sm);
}

.user-table tr:hover {
    background: var(--light-gray);
}

.user-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: var(--radius-round);
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
}

.badge-admin {
    background: #8E2DE2;
    color: var(--white);
}

.badge-user {
    background: var(--primary-color);
    color: var(--white);
}

.badge-active {
    background: var(--success-color);
    color: var(--white);
}

.badge-inactive {
    background: var(--danger-color);
    color: var(--white);
}

/* Alerts */
.alert {
    padding: var(--space-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
    border: 1px solid;
}

.alert-success {
    background-color: #d4edda;
    border-color: #c3e6cb;
    color: #155724;
}

.alert-error {
    background-color: #f8d7da;
    border-color: #f5c6cb;
    color: #721c24;
}

.alert-info {
    background-color: #d1ecf1;
    border-color: #bee5eb;
    color: #0c5460;
}

/* Loading */
.loading {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid var(--gray);
    border-top: 3px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-2xl);
    color: var(--dark-gray);
    gap: var(--space-md);
}

.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(5px);
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
}

.loading-content {
    background: var(--white);
    padding: var(--space-2xl);
    border-radius: var(--radius-lg);
    text-align: center;
    box-shadow: var(--shadow-xl);
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--gray);
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--space-md);
}

/* Empty states */
.empty-state {
    text-align: center;
    padding: var(--space-2xl);
    color: var(--dark-gray);
}

/* Animations */
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
    .nav {
        flex-direction: column;
        gap: var(--space-md);
    }
    
    .nav-buttons {
        justify-content: center;
        width: 100%;
    }
    
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-md);
    }
    
    .stat-card {
        flex-direction: column;
        text-align: center;
        gap: var(--space-sm);
    }
    
    .form-row {
        grid-template-columns: 1fr;
    }
    
    .section-title {
        font-size: var(--font-size-2xl);
        flex-direction: column;
    }
}

@media (max-width: 480px) {
    .login-card {
        padding: var(--space-lg);
        margin: var(--space-md);
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .card {
        padding: var(--space-lg);
    }
}
EOF
    
    print_success "CSS deployed successfully"
}

# Update server.js with latest version
update_server() {
    print_status "Updating server.js..."
    
    # Create temporary directory for files
    mkdir -p "$TEMP_DIR"
    
    sudo tee "$APP_DIR/server.js" > /dev/null << 'EOF'
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
    initDatabase();
});

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

async function initDatabase() {
    try {
        await createTables();
        await createDefaultAdmin();
        await insertDefaultExercises();
        console.log('✅ Database initialization completed');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
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
                sets_count INTEGER NOT NULL DEFAULT 1,
                reps TEXT,
                weights TEXT,
                rest_time INTEGER DEFAULT 90,
                notes TEXT,
                FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
            )`
        ];
        
        let completed = 0;
        tables.forEach(sql => {
            db.exec(sql, (err) => {
                if (err) reject(err);
                else {
                    completed++;
                    if (completed === tables.length) resolve();
                }
            });
        });
    });
}

async function createDefaultAdmin() {
    return new Promise(async (resolve, reject) => {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        db.run(
            'INSERT OR IGNORE INTO users (username, email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
            ['admin', 'admin@gym.zhst.eu', hashedPassword, 'admin', 'Admin', 'User'],
            function(err) {
                if (err) reject(err);
                else {
                    console.log('✅ Default admin user ready: admin/admin123');
                    resolve();
                }
            }
        );
    });
}

function insertDefaultExercises() {
    return new Promise((resolve) => {
        const exercises = [
            ['Bankdrücken', 'Krafttraining', 'Brust', 'Grundübung für die Brustmuskulatur', 'Kontrolliert zur Brust führen'],
            ['Kniebeugen', 'Krafttraining', 'Beine', 'Grundübung für die Beinmuskulatur', 'Aufrecht stehen, in die Hocke gehen'],
            ['Kreuzheben', 'Krafttraining', 'Rücken', 'Grundübung für den gesamten Körper', 'Langhantel vom Boden nach oben ziehen'],
            ['Klimmzüge', 'Krafttraining', 'Rücken', 'Übung für den Latissimus und Bizeps', 'An der Stange hängen und sich nach oben ziehen'],
            ['Schulterdrücken', 'Krafttraining', 'Schultern', 'Übung für die Schultermuskulatur', 'Hantel über den Kopf drücken'],
            ['Plank', 'Krafttraining', 'Core', 'Statische Übung für die Rumpfmuskulatur', 'In Liegestützposition halten'],
            ['Laufband', 'Cardio', 'Cardio', 'Ausdauertraining', 'Gleichmäßiges Laufen auf dem Laufband']
        ];
        
        const stmt = db.prepare('INSERT OR IGNORE INTO exercises (name, category, muscle_group, description, instructions) VALUES (?, ?, ?, ?, ?)');
        exercises.forEach(exercise => stmt.run(exercise));
        stmt.finalize(() => {
            console.log('✅ Default exercises loaded');
            resolve();
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
        if (err) return res.status(403).json({ error: 'Invalid token' });
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
                        process.env.JWT_SECRET || 'your-secret-key',
                        { expiresIn: '24h' }
                    );
                    
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
        
        const hashedPassword = await bcrypt.hash(password, 12);
        
        db.run(
            'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, first_name || null, last_name || null],
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

// Admin routes
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    db.all(
        'SELECT id, username, email, first_name, last_name, role, is_active, created_at FROM users ORDER BY created_at DESC',
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

// User profile routes
app.get('/api/user/profile', authenticateToken, (req, res) => {
    db.get(
        'SELECT id, username, email, role, first_name, last_name, created_at FROM users WHERE id = ?',
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

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const stats = {};
    
    db.get(
        'SELECT COUNT(*) as count FROM workouts WHERE user_id = ?',
        [userId],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Internal server error' });
            }
            
            stats.totalWorkouts = result.count;
            
            db.get(
                'SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND date >= date("now", "-7 days")',
                [userId],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: 'Internal server error' });
                    }
                    
                    stats.thisWeekWorkouts = result.count;
                    
                    db.get(
                        'SELECT SUM(duration_minutes) as total FROM workouts WHERE user_id = ?',
                        [userId],
                        (err, result) => {
                            if (err) {
                                return res.status(500).json({ error: 'Internal server error' });
                            }
                            
                            stats.totalTime = result.total || 0;
                            
                            db.all(
                                'SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC LIMIT 5',
                                [userId],
                                (err, workouts) => {
                                    if (err) {
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

// Health check endpoint
app.get('/api/health', (req, res) => {
    db.get('SELECT 1 as test', (err) => {
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

// Start server
app.listen(PORT, () => {
    console.log('🏋️‍♂️ =======================================');
    console.log('🏋️‍♀️ GYM TRACKER SERVER STARTED');
    console.log('🏋️‍♂️ =======================================');
    console.log(`📱 Server: http://localhost:${PORT}`);
    console.log(`💾 Database: ${DB_PATH}`);
    console.log(`🔐 Default Admin: admin/admin123`);
    console.log('🏋️‍♂️ =======================================');
});
EOF
    
    print_success "Server updated successfully"
}

# Start services
start_services() {
    print_status "Starting services..."
    sudo systemctl daemon-reload
    sudo systemctl restart $APP_NAME
    sudo systemctl restart nginx
    
    # Wait for services
    sleep 3
    
    if systemctl is-active --quiet $APP_NAME; then
        print_success "Gym Tracker service started"
    else
        print_error "Failed to start Gym Tracker service"
        sudo journalctl -u $APP_NAME --no-pager -n 10
        return 1
    fi
    
    if systemctl is-active --quiet nginx; then
        print_success "Nginx service started"
    else
        print_error "Failed to start Nginx service"
        return 1
    fi
}

# Test deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Test health endpoint
    if curl -f -s http://localhost:3000/api/health > /dev/null; then
        print_success "Health check passed"
    else
        print_warning "Health check failed"
    fi
    
    # Test web interface
    if curl -f -s http://localhost:3000/ > /dev/null; then
        print_success "Web interface accessible"
    else
        print_warning "Web interface test failed"
    fi
}

# Cleanup
cleanup() {
    print_status "Cleaning up..."
    rm -rf "$TEMP_DIR"
    sudo chown -R $APP_NAME:$APP_NAME $APP_DIR
    print_success "Cleanup completed"
}

# Display final summary
display_summary() {
    clear
    echo -e "${PURPLE}"
    echo "🎉 ========================================================"
    echo "✅            DEPLOYMENT COMPLETED SUCCESSFULLY!         "
    echo "🚀                 GYM TRACKER v2.0                      "
    echo "🎉 ========================================================"
    echo -e "${NC}"
    echo
    echo "🌐 Your Gym Tracker is now running!"
    echo
    echo "📱 Access URLs:"
    echo "   Main Site: http://$DOMAIN"
    echo "   Health Check: http://$DOMAIN/api/health"
    echo
    echo "🔐 Default Login:"
    echo "   Username: admin"
    echo "   Password: admin123"
    echo "   ⚠️  Please change this password immediately!"
    echo
    echo "🔧 Quick Commands:"
    echo "   Restart: sudo systemctl restart $APP_NAME"
    echo "   Logs: sudo journalctl -u $APP_NAME -f"
    echo "   Status: sudo systemctl status $APP_NAME"
    echo
    echo "📂 Important Locations:"
    echo "   App Directory: $APP_DIR"
    echo "   Database: $APP_DIR/database/gym_tracker.db"
    echo "   Logs: /var/log/nginx/ & journalctl -u $APP_NAME"
    echo
    echo "🚀 Next Steps:"
    echo "1. Open $DOMAIN in your browser"
    echo "2. Login with admin/admin123"
    echo "3. Change the admin password"
    echo "4. Create user accounts for your friends"
    echo "5. Start tracking your workouts!"
    echo
    echo "========================================================"
}

# Main execution
main() {
    show_header
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        exit 1
    fi
    
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
    
    echo
    print_status "Starting deployment process..."
    
    # Execute deployment steps
    create_backup
    stop_services
    deploy_frontend
    deploy_javascript
    deploy_css
    update_server
    start_services
    test_deployment
    cleanup
    display_summary
}

# Error handling
set -e
trap 'print_error "Deployment failed at line $LINENO. Check the output above for details."' ERR

# Execute main function
main "$@"#!/bin/bash

# Gym Tracker - Final Deployment Script
# This script deploys the complete modular version

set -e

# Configuration
APP_NAME="gym-tracker"
APP_DIR="/var/www/$APP_NAME"
DOMAIN="${1:-gym.zhst.eu}"
BACKUP_DIR="$APP_DIR/backups"
TEMP_DIR="/tmp/gym-tracker-deploy"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

show_header() {
    clear
    echo -e "${PURPLE}"
    echo "🚀 ========================================================"
    echo "📱           GYM TRACKER - FINAL DEPLOYMENT             "
    echo "🏋️           COMPLETE MODULAR VERSION                   "
    echo "🚀 ========================================================"
    echo -e "${NC}"
    echo "Deploying to: $DOMAIN"
    echo "Target directory: $APP_DIR"
    echo "========================================================"
    echo
}

# Create backup of existing installation
create_backup() {
    if [ -d "$APP_DIR" ]; then
        print_status "Creating backup of existing installation..."
        local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
        sudo cp -r "$APP_DIR" "/tmp/$backup_name"
        print_success "Backup created: /tmp/$backup_name"
    fi
}

# Stop services
stop_services() {
    print_status "Stopping services..."
    sudo systemctl stop $APP_NAME 2>/dev/null || true
    print_success "Services stopped"
}

# Deploy frontend files
deploy_frontend() {
    print_status "Deploying frontend files..."
    
    # Ensure directories exist
    sudo mkdir -p "$APP_DIR/public/js"
    sudo mkdir -p "$APP_DIR/public/css"
    
    # Create complete index.html
    print_status "Creating index.html..."
    sudo tee "$APP_DIR/public/index.html" > /dev/null << 'EOF'
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gym Tracker - Ihr persönlicher Fitness-Begleiter</title>
    <meta name="description" content="Verfolgen Sie Ihre Workouts, überwachen Sie Ihren Fortschritt und erreichen Sie Ihre Fitnessziele mit Gym Tracker.">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <!-- Login/Register Screen -->
    <div id="loginScreen" class="login-container">
        <div class="login-card">
            <div class="login-header">
                <h1 class="login-title">💪 Gym Tracker</h1>
                <p class="login-subtitle">Ihr persönlicher Fitness-Begleiter</p>
            </div>
            
            <div class="auth-tabs">
                <button class="auth-tab active" onclick="Auth.showTab('login')">Anmelden</button>
                <button class="auth-tab" onclick="Auth.showTab('register')">Registrieren</button>
            </div>
            
            <div id="alertContainer"></div>
            
            <!-- Login Form -->
            <form id="loginForm" class="auth-form">
                <div class="form-group">
                    <label for="loginUsername">Benutzername oder E-Mail</label>
                    <input type="text" id="loginUsername" name="username" required autocomplete="username" placeholder="Ihr Benutzername oder E-Mail">
                </div>
                
                <div class="form-group">
                    <label for="loginPassword">Passwort</label>
                    <input type="password" id="loginPassword" name="password" required autocomplete="current-password" placeholder="Ihr Passwort">
                </div>
                
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-bottom: 15px;">
                    <span id="loginButtonText">Anmelden</span>
                    <div id="loginLoading" class="loading hidden"></div>
                </button>
                
                <div class="auth-help">
                    <p>Standard Admin-Zugang: <strong>admin</strong> / <strong>admin123</strong></p>
                    <small>Bitte ändern Sie das Passwort nach der ersten Anmeldung!</small>
                </div>
            </form>
            
            <!-- Register Form -->
            <form id="registerForm" class="auth-form hidden">
                <div class="form-row">
                    <div class="form-group">
                        <label for="registerFirstName">Vorname</label>
                        <input type="text" id="registerFirstName" name="first_name" maxlength="50" placeholder="Ihr Vorname">
                    </div>
                    
                    <div class="form-group">
                        <label for="registerLastName">Nachname</label>
                        <input type="text" id="registerLastName" name="last_name" maxlength="50" placeholder="Ihr Nachname">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="registerUsername">Benutzername *</label>
                    <input type="text" id="registerUsername" name="username" required minlength="3" maxlength="50" placeholder="Wählen Sie einen Benutzernamen">
                </div>
                
                <div class="form-group">
                    <label for="registerEmail">E-Mail-Adresse *</label>
                    <input type="email" id="registerEmail" name="email" required placeholder="ihre.email@domain.de">
                </div>
                
                <div class="form-group">
                    <label for="registerPassword">Passwort *</label>
                    <input type="password" id="registerPassword" name="password" required minlength="6" autocomplete="new-password" placeholder="Mindestens 6 Zeichen">
                </div>
                
                <div class="form-group">
                    <label for="registerPasswordConfirm">Passwort bestätigen *</label>
                    <input type="password" id="registerPasswordConfirm" name="passwordConfirm" required minlength="6" autocomplete="new-password" placeholder="Passwort wiederholen">
                </div>
                
                <button type="submit" class="btn btn-success" style="width: 100%; margin-bottom: 15px;">
                    <span id="registerButtonText">Konto erstellen</span>
                    <div id="registerLoading" class="loading hidden"></div>
                </button>
                
                <div class="auth-help">
                    <small>Mit der Registrierung stimmen Sie den Nutzungsbedingungen zu.</small>
                </div>
            </form>
        </div>
    </div>

    <!-- Main Application -->
    <div id="mainApp" class="hidden">
        <div class="header">
            <nav class="nav">
                <div class="logo">
                    <span class="logo-icon">💪</span>
                    <span class="logo-text">Gym Tracker</span>
                    <span id="userWelcome" class="user-welcome"></span>
                </div>
                <div class="nav-buttons">
                    <button class="btn nav-btn" onclick="App.showSection('dashboard')" data-section="dashboard">
                        <span class="btn-icon">📊</span>
                        <span class="btn-text">Dashboard</span>
                    </button>
                    <button class="btn nav-btn" onclick="App.showSection('workouts')" data-section="workouts">
                        <span class="btn-icon">🏋️</span>
                        <span class="btn-text">Workouts</span>
                    </button>
                    <button class="btn nav-btn" onclick="App.showSection('exercises')" data-section="exercises">
                        <span class="btn-icon">💪</span>
                        <span class="btn-text">Übungen</span>
                    </button>
                    <button class="btn btn-success nav-btn" onclick="App.showSection('newWorkout')" data-section="newWorkout">
                        <span class="btn-icon">➕</span>
                        <span class="btn-text">Neues Training</span>
                    </button>
                    <button id="adminButton" class="btn btn-admin nav-btn hidden" onclick="App.showSection('admin')" data-section="admin">
                        <span class="btn-icon">👑</span>
                        <span class="btn-text">Admin</span>
                    </button>
                    <div class="nav-dropdown">
                        <button class="btn btn-info dropdown-toggle">
                            <span class="btn-icon">👤</span>
                            <span class="btn-text">Profil</span>
                            <span class="dropdown-arrow">▼</span>
                        </button>
                        <div class="dropdown-menu">
                            <a href="#" onclick="Auth.showProfileModal()">👤 Profil bearbeiten</a>
                            <a href="#" onclick="App.exportData()">💾 Daten exportieren</a>
                            <hr>
                            <a href="#" onclick="Auth.logout()" class="logout-link">🚪 Abmelden</a>
                        </div>
                    </div>
                </div>
            </nav>
        </div>

        <div class="main-container">
            <!-- Dashboard Section -->
            <div id="dashboard" class="section">
                <div class="section-header">
                    <h1 class="section-title">📊 Dashboard</h1>
                    <p class="section-subtitle">Übersicht über Ihre Fitness-Fortschritte</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card primary">
                        <div class="stat-icon">🏋️</div>
                        <div class="stat-content">
                            <div class="stat-number" id="totalWorkouts">0</div>
                            <div class="stat-label">Trainings gesamt</div>
                        </div>
                    </div>
                    <div class="stat-card secondary">
                        <div class="stat-icon">📅</div>
                        <div class="stat-content">
                            <div class="stat-number" id="thisWeekWorkouts">0</div>
                            <div class="stat-label">Diese Woche</div>
                        </div>
                    </div>
                    <div class="stat-card accent">
                        <div class="stat-icon">⏱️</div>
                        <div class="stat-content">
                            <div class="stat-number" id="totalTime">0</div>
                            <div class="stat-label">Minuten gesamt</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">📈 Letzte Trainings</h2>
                        <button class="btn btn-sm btn-outline" onclick="App.showSection('workouts')">Alle anzeigen</button>
                    </div>
                    <div class="card-content">
                        <div id="recentWorkouts" class="workouts-list">
                            <div class="loading-state">
                                <div class="loading"></div>
                                <p>Lade Trainings...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Other sections will be loaded dynamically -->
            <div id="admin" class="section hidden">
                <div class="section-header">
                    <h1 class="section-title">👑 Admin-Bereich</h1>
                </div>
                <div id="adminContent">Loading...</div>
            </div>
            
            <div id="workouts" class="section hidden">
                <div class="section-header">
                    <h1 class="section-title">🏋️ Meine Trainings</h1>
                </div>
                <div id="workoutsContent">Loading...</div>
            </div>
            
            <div id="exercises" class="section hidden">
                <div class="section-header">
                    <h1 class="section-title">💪 Übungen</h1>
                </div>
                <div id="exercisesContent">Loading...</div>
            </div>
            
            <div id="newWorkout" class="section hidden">
                <div class="section-header">
                    <h1 class="section-title">➕ Neues Training</h1>
                </div>
                <div id="newWorkoutContent">Loading...</div>
            </div>
        </div>
    </div>

    <!-- Modals will be loaded dynamically -->
    <div id="modalContainer"></div>
    
    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="loading-overlay hidden">
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <p id="loadingText">Lädt...</p>
        </div>
    </div>

    <!-- Scripts -->
    <script src="js/utils.js"></script>
    <script src="js/auth.js"></script>
    <script src="js/workouts.js"></script>
    <script src="js/exercises.js"></script>
    <script src="js/admin.js"></script>
    <script src="js/app.js"></script>
</body>
</html>
EOF
    
    print_success "Frontend deployed successfully"
}

# Deploy JavaScript modules (minimal versions for this script)
deploy_javascript() {
    print_status "Deploying JavaScript modules..."
    
    # Create basic JavaScript files
    cat > "$TEMP_DIR/utils.js" << 'EOF'
// Gym Tracker Utils - Minimal version for deployment
const Utils = {
    API_BASE: '/api',
    
    showAlert(message, type = 'info', containerId = 'alertContainer') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        container.innerHTML = '';
        container.appendChild(alert);
        
        setTimeout(() => alert.remove(), 5000);
    },
    
    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const response = await fetch(this.API_BASE + endpoint, { ...defaultOptions, ...options });
        
        if (response.status === 401) {
            Auth.logout();
            throw new Error('Sitzung abgelaufen');
        }
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'API Error');
        return data;
    },
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('de-DE');
    }
};
EOF

    cat > "$TEMP_DIR/auth.js" << 'EOF'
// Gym Tracker Auth - Minimal version
const Auth = {
    currentUser: null,
    authToken: null,

    init() {
        const token = localStorage.getItem('authToken');
        if (token) {
            this.authToken = token;
            this.verifyTokenAndLogin();
        }
        this.setupEventListeners();
    },

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }
        
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }
    },

    async verifyTokenAndLogin() {
        try {
            const user = await Utils.apiCall('/user/profile');
            if (user) {
                this.currentUser = user;
                this.showMainApp();
                App.loadDashboard();
            }
        } catch (error) {
            this.logout();
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        try {
            const credentials = {
                username: document.getElementById('loginUsername').value,
                password: document.getElementById('loginPassword').value
            };

            const response = await Utils.apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            this.authToken = response.token;
            this.currentUser = response.user;
            localStorage.setItem('authToken', this.authToken);
            
            this.showMainApp();
            App.loadDashboard();
        } catch (error) {
            Utils.showAlert(error.message, 'error');
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        try {
            const password = document.getElementById('registerPassword').value;
            const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

            if (password !== passwordConfirm) {
                throw new Error('Passwörter stimmen nicht überein');
            }

            const userData = {
                username: document.getElementById('registerUsername').value,
                email: document.getElementById('registerEmail').value,
                password: password,
                first_name: document.getElementById('registerFirstName').value || null,
                last_name: document.getElementById('registerLastName').value || null
            };
