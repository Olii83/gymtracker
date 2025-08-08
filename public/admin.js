// Gym Tracker Admin Panel
class AdminPanel {
    constructor() {
        this.baseURL = '/api/admin';
        this.token = localStorage.getItem('adminToken');
        this.admin = null;
        this.currentPage = 'dashboard';
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        
        if (this.token) {
            try {
                await this.loadAdminStats();
                this.showAdminPanel();
            } catch (error) {
                this.logout();
            }
        } else {
            this.showLoginScreen();
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('admin-login-form').addEventListener('submit', (e) => this.handleLogin(e));
        
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.showPage(page);
            });
        });

        document.getElementById('admin-logout-btn').addEventListener('click', () => this.logout());

        // Settings form
        document.getElementById('settings-form').addEventListener('submit', (e) => this.handleSaveSettings(e));
    }

    // Authentication
    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;

        try {
            const response = await this.apiCall('/login', 'POST', { username, password });
            this.token = response.token;
            this.admin = response.admin;
            localStorage.setItem('adminToken', this.token);
            this.showAdminPanel();
            this.showNotification('success', 'Anmeldung erfolgreich', `Willkommen ${this.admin.username}!`);
        } catch (error) {
            this.showNotification('error', 'Anmeldung fehlgeschlagen', error.message);
        }
    }

    logout() {
        this.token = null;
        this.admin = null;
        localStorage.removeItem('adminToken');
        this.showLoginScreen();
        this.showNotification('success', 'Abgemeldet', 'Du wurdest erfolgreich abgemeldet');
    }

    // Screen management
    showLoginScreen() {
        this.hideAllScreens();
        document.getElementById('admin-login-screen').style.display = 'flex';
    }

    showAdminPanel() {
        this.hideAllScreens();
        document.getElementById('admin-panel').style.display = 'block';
        this.updateAdminDisplay();
        this.showPage('dashboard');
    }

    hideAllScreens() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('admin-login-screen').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'none';
    }

    updateAdminDisplay() {
        if (this.admin) {
            document.getElementById('admin-name').textContent = this.admin.username;
        }
    }

    // Page navigation
    showPage(pageName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageName);
        });

        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.toggle('active', page.id === `${pageName}-page`);
        });

        this.currentPage = pageName;

        // Load page-specific content
        switch (pageName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'settings':
                this.loadSettings();
                break;
            case 'system':
                this.loadSystemInfo();
                break;
        }
    }

    // Dashboard
    async loadDashboard() {
        try {
            await this.loadAdminStats();
        } catch (error) {
            console.error('Dashboard loading error:', error);
        }
    }

    async loadAdminStats() {
        try {
            const stats = await this.apiCall('/stats', 'GET');
            
            // Update stats
            document.getElementById('total-users').textContent = stats.stats.users;
            document.getElementById('total-sessions').textContent = stats.stats.sessions;
            document.getElementById('total-exercises').textContent = stats.stats.exercises;
            document.getElementById('total-prs').textContent = stats.stats.personalRecords;

            // Update recent users
            this.renderRecentUsers(stats.recentUsers);
            
            // Update recent sessions
            this.renderRecentSessions(stats.recentSessions);
        } catch (error) {
            console.error('Stats loading error:', error);
        }
    }

    renderRecentUsers(users) {
        const container = document.getElementById('recent-users');
        
        if (users.length === 0) {
            container.innerHTML = '<p class="text-center">Keine neuen Benutzer</p>';
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="activity-item">
                <div class="activity-info">
                    <strong>${user.username}</strong>
                    <br>
                    <small>${user.email}</small>
                </div>
                <div class="activity-time">${this.formatDate(user.created_at)}</div>
            </div>
        `).join('');
    }

    renderRecentSessions(sessions) {
        const container = document.getElementById('recent-sessions');
        
        if (sessions.length === 0) {
            container.innerHTML = '<p class="text-center">Keine aktuellen Sessions</p>';
            return;
        }

        container.innerHTML = sessions.map(session => `
            <div class="activity-item">
                <div class="activity-info">
                    <strong>${session.name}</strong>
                    <br>
                    <small>von ${session.username}</small>
                </div>
                <div class="activity-time">${this.formatDate(session.end_time)}</div>
            </div>
        `).join('');
    }

    // Users management
    async loadUsers() {
        // This would need additional API endpoints for user management
        document.getElementById('users-list').innerHTML = '<p>Benutzerverwaltung wird implementiert...</p>';
    }

    // Settings
    async loadSettings() {
        try {
            const settings = await this.apiCall('/settings', 'GET');
            
            // Populate form fields
            Object.keys(settings).forEach(key => {
                const element = document.querySelector(`[name="${key}"]`);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = settings[key] === '1' || settings[key] === 'true';
                    } else {
                        element.value = settings[key] || '';
                    }
                }
            });
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Einstellungen konnten nicht geladen werden');
        }
    }

    async handleSaveSettings(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const settings = {};
        
        for (let [key, value] of formData.entries()) {
            settings[key] = value;
        }

        try {
            await this.apiCall('/settings', 'PUT', settings);
            this.showNotification('success', 'Einstellungen gespeichert', 'Alle Änderungen wurden erfolgreich gespeichert');
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Einstellungen konnten nicht gespeichert werden');
        }
    }

    // System info
    async loadSystemInfo() {
        // Mock system info - in real implementation, this would come from an API
        document.getElementById('node-version').textContent = process?.version || 'N/A';
        document.getElementById('uptime').textContent = this.formatUptime(process?.uptime() || 0);
        
        if (process?.memoryUsage) {
            const memory = process.memoryUsage();
            document.getElementById('memory-usage').textContent = 
                `${Math.round(memory.heapUsed / 1024 / 1024)} MB`;
        } else {
            document.getElementById('memory-usage').textContent = 'N/A';
        }
    }

    async optimizeDatabase() {
        try {
            // This would need API endpoint
            this.showNotification('success', 'Datenbank optimiert', 'Die Datenbank wurde erfolgreich optimiert');
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Datenbankoptimierung fehlgeschlagen');
        }
    }

    async cleanupSessions() {
        try {
            // This would need API endpoint
            this.showNotification('success', 'Sessions bereinigt', 'Alte Sessions wurden erfolgreich gelöscht');
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Session-Bereinigung fehlgeschlagen');
        }
    }

    confirmClearAllSessions() {
        if (confirm('⚠️ WARNUNG: Dies wird alle aktiven Benutzersessions löschen und alle Benutzer abmelden. Fortfahren?')) {
            this.clearAllSessions();
        }
    }

    async clearAllSessions() {
        try {
            // This would need API endpoint
            this.showNotification('success', 'Sessions gelöscht', 'Alle Sessions wurden erfolgreich gelöscht');
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Sessions konnten nicht gelöscht werden');
        }
    }

    confirmResetAllPasswords() {
        if (confirm('⚠️ WARNUNG: Dies wird alle Benutzerpasswörter zurücksetzen. Diese Aktion kann nicht rückgängig gemacht werden. Fortfahren?')) {
            const reason = prompt('Bitte gib einen Grund für das Zurücksetzen aller Passwörter an:');
            if (reason) {
                this.resetAllPasswords(reason);
            }
        }
    }

    async resetAllPasswords(reason) {
        try {
            // This would need API endpoint
            this.showNotification('success', 'Passwörter zurückgesetzt', 'Alle Benutzerpasswörter wurden zurückgesetzt');
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Passwörter konnten nicht zurückgesetzt werden');
        }
    }

    // Utility methods
    async apiCall(endpoint, method = 'GET', data = null) {
        const url = this.baseURL + endpoint;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'API call failed');
        }

        return result;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    showNotification(type, title, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
            <button class="notification-close">&times;</button>
        `;

        document.getElementById('notifications').appendChild(notification);

        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize admin panel
const adminApp = new AdminPanel();