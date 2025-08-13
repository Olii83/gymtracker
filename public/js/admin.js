// Admin-Modul für Gym Tracker

const Admin = {
    // Zustandsvariablen
    users: [],
    stats: null,

    /**
     * Initialisiert das Admin-Modul
     */
    init() {
        this.setupEventListeners();
    },

    /**
     * Richtet Event-Listener ein
     */
    setupEventListeners() {
        const passwordResetForm = document.getElementById('adminPasswordResetForm');
        if (passwordResetForm) {
            passwordResetForm.addEventListener('submit', this.handlePasswordReset.bind(this));
        }

        const deleteUserForm = document.getElementById('deleteUserForm');
        if (deleteUserForm) {
            deleteUserForm.addEventListener('submit', this.handleDeleteUser.bind(this));
        }
    },

    /**
     * Lädt Admin-Dashboard
     */
    async loadDashboard() {
        if (!Auth.isAdmin()) {
            Utils.showAlert('Keine Admin-Berechtigung', 'error');
            App.showSection('dashboard');
            return;
        }

        try {
            // Benutzer und Statistiken parallel laden
            const [users, stats] = await Promise.all([
                Utils.apiCall('/admin/users'),
                Utils.apiCall('/admin/stats')
            ]);
            
            this.users = users || [];
            this.stats = stats || {};
            
            this.displayStats(this.stats);
            this.displayUsersTable(this.users);
        } catch (error) {
            console.error('Admin: Dashboard-Ladefehler:', error);
            Utils.showAlert('Fehler beim Laden der Admin-Daten: ' + error.message, 'error');
        }
    },

    /**
     * Zeigt Admin-Statistiken an
     * @param {object} stats - Statistik-Daten
     */
    displayStats(stats) {
        const elements = {
            totalUsers: document.getElementById('totalUsers'),
            activeUsers: document.getElementById('activeUsers'),
            totalAdminWorkouts: document.getElementById('totalAdminWorkouts')
        };

        // Statistiken in entsprechende Elemente einfügen
        if (elements.totalUsers) {
            elements.totalUsers.textContent = stats.totalUsers || 0;
        }
        
        if (elements.activeUsers) {
            elements.activeUsers.textContent = stats.activeUsers || 0;
        }
        
        if (elements.totalAdminWorkouts) {
            elements.totalAdminWorkouts.textContent = stats.totalWorkouts || 0;
        }
    },

    /**
     * Zeigt Benutzertabelle an
     * @param {Array} users - Array der Benutzer
     */
    displayUsersTable(users) {
        const tbody = document.getElementById('userTableBody');
        if (!tbody) return;
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Keine Benutzer gefunden</td></tr>';
            return;
        }
        
        // Benutzer-HTML generieren
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${Utils.sanitizeInput(user.username)}</td>
                <td>${Utils.sanitizeInput(user.email)}</td>
                <td>${Utils.sanitizeInput((user.first_name || '') + ' ' + (user.last_name || '')).trim()}</td>
                <td><span class="user-badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}">${user.role === 'admin' ? 'Admin' : 'Benutzer'}</span></td>
                <td><span class="user-badge ${user.is_active ? 'badge-active' : 'badge-inactive'}">${user.is_active ? 'Aktiv' : 'Inaktiv'}</span></td>
                <td>${Utils.formatDate(user.created_at)}</td>
                <td>
                    <div class="user-actions">
                        <button class="btn btn-warning" onclick="Admin.showPasswordResetModal(${user.id}, '${Utils.sanitizeInput(user.username)}')" title="Passwort zurücksetzen">
                            Passwort
                        </button>
                        <button class="btn ${user.is_active ? 'btn-danger' : 'btn-success'}" 
                                onclick="Admin.toggleUserStatus(${user.id}, ${!user.is_active})" 
                                title="${user.is_active ? 'Deaktivieren' : 'Aktivieren'}">
                            ${user.is_active ? 'Deaktivieren' : 'Aktivieren'}
                        </button>
                        ${user.id !== Auth.getCurrentUser().id ? `
                            <button class="btn btn-danger" onclick="Admin.showDeleteUserModal(${user.id}, '${Utils.sanitizeInput(user.username)}')" title="Benutzer löschen">
                                Löschen
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    },

    /**
     * Schaltet Benutzerstatus um (aktiv/inaktiv)
     * @param {number} userId - Benutzer-ID
     * @param {boolean} activate - Aktivieren oder deaktivieren
     */
    async toggleUserStatus(userId, activate) {
        try {
            await Utils.apiCall(`/admin/users/${userId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: activate })
            });
            
            Utils.showAlert(`Benutzer ${activate ? 'aktiviert' : 'deaktiviert'}`, 'success');
            this.loadDashboard();
        } catch (error) {
            console.error('Admin: Fehler beim Ändern des Benutzerstatus:', error);
            Utils.showAlert('Fehler beim Ändern des Benutzerstatus: ' + error.message, 'error');
        }
    },

    /**
     * Zeigt Passwort-Zurücksetzungs-Modal an
     * @param {number} userId - Benutzer-ID
     * @param {string} username - Benutzername
     */
    showPasswordResetModal(userId, username) {
        document.getElementById('resetUserId').value = userId;
        document.getElementById('resetUsername').textContent = username;
        document.getElementById('passwordResetModal').style.display = 'block';
    },

    /**
     * Schließt Passwort-Zurücksetzungs-Modal
     */
    closePasswordResetModal() {
        document.getElementById('passwordResetModal').style.display = 'none';
        document.getElementById('adminPasswordResetForm').reset();
    },

    /**
     * Behandelt Passwort-Zurücksetzung
     * @param {Event} e - Form-Submit-Event
     */
    async handlePasswordReset(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            // Button-Zustand während Request ändern
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading"></div>';
            
            const newPassword = document.getElementById('adminNewPassword').value;
            const confirmPassword = document.getElementById('adminConfirmPassword').value;
            const userId = document.getElementById('resetUserId').value;
            
            // Validierung
            if (!newPassword || !confirmPassword) {
                throw new Error('Bitte füllen Sie alle Felder aus');
            }

            const passwordError = Utils.validatePassword(newPassword);
            if (passwordError) {
                throw new Error(passwordError);
            }
            
            if (newPassword !== confirmPassword) {
                throw new Error('Passwörter stimmen nicht überein');
            }
            
            // Passwort zurücksetzen
            await Utils.apiCall(`/admin/users/${userId}/reset-password`, {
                method: 'POST',
                body: JSON.stringify({ newPassword })
            });
            
            Utils.showAlert('Passwort erfolgreich zurückgesetzt', 'success');
            this.closePasswordResetModal();
        } catch (error) {
            console.error('Admin: Passwort-Zurücksetzungs-Fehler:', error);
            Utils.showAlert('Fehler beim Zurücksetzen des Passworts: ' + error.message, 'error');
        } finally {
            // Button-Zustand zurücksetzen
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    /**
     * Zeigt Benutzer-Löschungs-Modal an
     * @param {number} userId - Benutzer-ID
     * @param {string} username - Benutzername
     */
    showDeleteUserModal(userId, username) {
        document.getElementById('deleteUserId').value = userId;
        document.getElementById('deleteUsername').textContent = username;
        document.getElementById('deleteUserModal').style.display = 'block';
    },

    /**
     * Schließt Benutzer-Löschungs-Modal
     */
    closeDeleteUserModal() {
        document.getElementById('deleteUserModal').style.display = 'none';
        document.getElementById('deleteUserForm').reset();
    },

    /**
     * Behandelt Benutzer-Löschung
     * @param {Event} e - Form-Submit-Event
     */
    async handleDeleteUser(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            // Button-Zustand während Request ändern
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading"></div>';
            
            const confirmation = document.getElementById('deleteConfirmation').value;
            const userId = document.getElementById('deleteUserId').value;
            
            // Bestätigung prüfen
            if (confirmation !== 'LÖSCHEN') {
                throw new Error('Bitte geben Sie "LÖSCHEN" ein, um zu bestätigen');
            }

            // Prüfen ob eigenes Konto gelöscht werden soll
            if (parseInt(userId) === Auth.getCurrentUser().id) {
                throw new Error('Sie können Ihr eigenes Konto nicht löschen');
            }
            
            // Benutzer löschen
            await Utils.apiCall(`/admin/users/${userId}`, {
                method: 'DELETE'
            });
            
            Utils.showAlert('Benutzer erfolgreich gelöscht', 'success');
            this.closeDeleteUserModal();
            this.loadDashboard();
        } catch (error) {
            console.error('Admin: Benutzer-Löschungs-Fehler:', error);
            Utils.showAlert('Fehler beim Löschen des Benutzers: ' + error.message, 'error');
        } finally {
            // Button-Zustand zurücksetzen
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    /**
     * Gibt Benutzer nach ID zurück
     * @param {number} userId - Benutzer-ID
     * @returns {object|undefined} - Benutzer-Objekt oder undefined
     */
    getUserById(userId) {
        return this.users.find(u => u.id === userId);
    },

    /**
     * Durchsucht Benutzer
     * @param {string} query - Suchbegriff
     * @returns {Array} - Array der gefundenen Benutzer
     */
    searchUsers(query) {
        if (!query || query.length < 2) return this.users;
        
        const lowerQuery = query.toLowerCase();
        return this.users.filter(user => 
            user.username.toLowerCase().includes(lowerQuery) ||
            user.email.toLowerCase().includes(lowerQuery) ||
            (user.first_name && user.first_name.toLowerCase().includes(lowerQuery)) ||
            (user.last_name && user.last_name.toLowerCase().includes(lowerQuery))
        );
    },

    /**
     * Filtert Benutzer nach Status
     * @param {boolean} isActive - Aktiv-Status
     * @returns {Array} - Gefilterte Benutzer
     */
    filterUsersByStatus(isActive) {
        return this.users.filter(user => user.is_active === isActive);
    },

    /**
     * Filtert Benutzer nach Rolle
     * @param {string} role - Benutzerrolle
     * @returns {Array} - Gefilterte Benutzer
     */
    filterUsersByRole(role) {
        return this.users.filter(user => user.role === role);
    },

    /**
     * Gibt Benutzerstatistiken zurück
     * @returns {object|null} - Statistik-Objekt oder null
     */
    getUserStats() {
        if (!this.users.length) return null;

        const activeUsers = this.users.filter(u => u.is_active).length;
        const inactiveUsers = this.users.length - activeUsers;
        const adminUsers = this.users.filter(u => u.role === 'admin').length;
        const regularUsers = this.users.length - adminUsers;

        // Registrierungstrends berechnen (letzte 30 Tage)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentRegistrations = this.users.filter(u => 
            new Date(u.created_at) >= thirtyDaysAgo
        ).length;

        return {
            total: this.users.length,
            active: activeUsers,
            inactive: inactiveUsers,
            admins: adminUsers,
            regular: regularUsers,
            recentRegistrations,
            activationRate: this.users.length > 0 ? (activeUsers / this.users.length * 100).toFixed(1) : 0
        };
    },

    /**
     * Exportiert Benutzerdaten
     */
    exportUsers() {
        if (!this.users.length) {
            Utils.showAlert('Keine Benutzerdaten zum Exportieren', 'warning');
            return;
        }

        // Sensible Daten für Export entfernen
        const exportData = this.users.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            is_active: user.is_active,
            created_at: user.created_at
        }));

        const filename = `gym-tracker-users-${new Date().toISOString().split('T')[0]}.json`;
        Utils.downloadJSON(exportData, filename);
        Utils.showAlert('Benutzerdaten exportiert', 'success');
    },

    /**
     * Erstellt neuen Benutzer (für zukünftige Verwendung)
     * @param {object} userData - Benutzerdaten
     */
    async createUser(userData) {
        try {
            await Utils.apiCall('/admin/users', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            
            Utils.showAlert('Benutzer erfolgreich erstellt', 'success');
            this.loadDashboard();
        } catch (error) {
            console.error('Admin: Benutzer-Erstellungs-Fehler:', error);
            Utils.showAlert('Fehler beim Erstellen des Benutzers: ' + error.message, 'error');
            throw error;
        }
    },

    /**
     * Aktualisiert Benutzer (für zukünftige Verwendung)
     * @param {number} userId - Benutzer-ID
     * @param {object} userData - Neue Benutzerdaten
     */
    async updateUser(userId, userData) {
        try {
            await Utils.apiCall(`/admin/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
            
            Utils.showAlert('Benutzer erfolgreich aktualisiert', 'success');
            this.loadDashboard();
        } catch (error) {
            console.error('Admin: Benutzer-Update-Fehler:', error);
            Utils.showAlert('Fehler beim Aktualisieren des Benutzers: ' + error.message, 'error');
            throw error;
        }
    },

    /**
     * Löscht zwischengespeicherte Daten
     */
    clearCache() {
        this.users = [];
        this.stats = null;
    },

    /**
     * Gibt Benutzerdaten zurück
     * @returns {Array} - Array der Benutzer
     */
    getUsers() {
        return this.users;
    },

    /**
     * Gibt Statistiken zurück
     * @returns {object|null} - Statistik-Objekt oder null
     */
    getStats() {
        return this.stats;
    },

    /**
     * Validiert Admin-Berechtigungen
     * @throws {Error} - Wenn keine Berechtigung vorhanden
     */
    validateAdminAccess() {
        if (!Auth.isAuthenticated()) {
            throw new Error('Nicht angemeldet');
        }
        
        if (!Auth.isAdmin()) {
            throw new Error('Keine Admin-Berechtigung');
        }
        
        return true;
    },

    /**
     * Führt Datenbankwartung durch (für zukünftige Verwendung)
     */
    async performMaintenance() {
        try {
            this.validateAdminAccess();
            
            await Utils.apiCall('/admin/maintenance', {
                method: 'POST'
            });
            
            Utils.showAlert('Wartung erfolgreich durchgeführt', 'success');
        } catch (error) {
            console.error('Admin: Wartungs-Fehler:', error);
            Utils.showAlert('Fehler bei der Wartung: ' + error.message, 'error');
            throw error;
        }
    },

    /**
     * Erstellt Datenbank-Backup (für zukünftige Verwendung)
     */
    async createBackup() {
        try {
            this.validateAdminAccess();
            
            const backup = await Utils.apiCall('/admin/backup', {
                method: 'POST'
            });
            
            if (backup && backup.filename) {
                Utils.showAlert(`Backup erstellt: ${backup.filename}`, 'success');
            } else {
                Utils.showAlert('Backup erfolgreich erstellt', 'success');
            }
        } catch (error) {
            console.error('Admin: Backup-Fehler:', error);
            Utils.showAlert('Fehler beim Erstellen des Backups: ' + error.message, 'error');
            throw error;
        }
    }
};