// Admin-Modul für Gym Tracker - Überarbeitete Version
// Dieses Modul verwaltet alle Administrator-Funktionen wie Benutzerverwaltung und Dashboard-Statistiken.

const Admin = {
    // Zustandsvariablen für das Admin-Dashboard
    users: [],
    stats: null,
    
    /**
     * Initialisiert das Admin-Modul und richtet Event-Listener ein.
     */
    init() {
        console.log('Admin: Initialisiere Modul...');
        this.setupEventListeners();
        console.log('Admin: Modul erfolgreich initialisiert.');
    },

    /**
     * Richtet alle Event-Listener für das Admin-Dashboard ein.
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
        
        const backupButton = document.getElementById('adminBackupButton');
        if (backupButton) {
            // Hinzugefügt: Event-Listener für Backup-Button
            backupButton.addEventListener('click', this.createBackup.bind(this));
        }
        
        const maintenanceButton = document.getElementById('adminMaintenanceButton');
        if (maintenanceButton) {
             // Hinzugefügt: Event-Listener für Wartungs-Button
            maintenanceButton.addEventListener('click', this.performMaintenance.bind(this));
        }
    },

    /**
     * Läd alle Daten für das Admin-Dashboard (Benutzerliste und Statistiken).
     * Stellt sicher, dass nur Admins auf diese Funktion zugreifen können.
     */
    async loadDashboard() {
        // Prüfe auf Admin-Berechtigung
        if (!Auth.isAdmin()) {
            Utils.showAlert('Keine Admin-Berechtigung', 'error');
            App.showSection('dashboard');
            return;
        }

        try {
            App.showLoading('adminDashboard');
            
            // Benutzer und Statistiken parallel laden, um die Performance zu verbessern
            const [users, stats] = await Promise.all([
                Utils.apiCall('/admin/users'),
                Utils.apiCall('/admin/stats')
            ]);
            
            this.users = users || [];
            this.stats = stats || {};
            
            this.displayStats(this.stats);
            this.displayUsersTable(this.users);
            
            App.hideLoading('adminDashboard');
        } catch (error) {
            console.error('Admin: Dashboard-Ladefehler:', error);
            Utils.showAlert('Fehler beim Laden des Admin-Dashboards: ' + error.message, 'error');
            App.hideLoading('adminDashboard');
        }
    },

    /**
     * Zeigt die allgemeinen Statistiken im Dashboard an.
     * @param {object} stats - Das Statistik-Objekt
     */
    displayStats(stats) {
        const statsContainer = document.getElementById('adminStats');
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="stat-card"><h3>Benutzer gesamt</h3><p>${stats.totalUsers || 0}</p></div>
            <div class="stat-card"><h3>Workouts gesamt</h3><p>${stats.totalWorkouts || 0}</p></div>
            <div class="stat-card"><h3>Neue Benutzer (30 Tage)</h3><p>${stats.newUsersLast30Days || 0}</p></div>
        `;
    },

    /**
     * Zeigt die Benutzerliste in einer Tabelle an.
     * @param {Array<object>} users - Array von Benutzer-Objekten
     */
    displayUsersTable(users) {
        const usersTableBody = document.getElementById('adminUsersTableBody');
        if (!usersTableBody) return;
        
        usersTableBody.innerHTML = ''; // Vorherige Daten löschen
        
        if (users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Keine Benutzer gefunden.</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.username || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.role || 'user'}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="Admin.showPasswordResetModal('${user.id}')">Passwort</button>
                    <button class="btn btn-sm btn-danger" onclick="Admin.showDeleteUserModal('${user.id}')">Löschen</button>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
    },

    /**
     * Behandelt das Zurücksetzen eines Benutzerpassworts.
     * @param {Event} event - Das Formular-Submit-Event
     */
    async handlePasswordReset(event) {
        event.preventDefault();
        
        const form = event.target;
        const userId = form.dataset.userId;
        const newPassword = document.getElementById('newPassword').value;
        
        if (!userId || !newPassword) {
            Utils.showAlert('Benutzer-ID oder Passwort fehlt', 'error');
            return;
        }

        try {
            await Utils.apiCall(`/admin/users/${userId}/password`, {
                method: 'PUT',
                body: JSON.stringify({ newPassword })
            });
            
            Utils.showAlert('Passwort erfolgreich zurückgesetzt', 'success');
            Modals.closeModal('adminPasswordResetModal');
        } catch (error) {
            console.error('Admin: Passwort-Reset-Fehler:', error);
            Utils.showAlert('Fehler beim Zurücksetzen des Passworts: ' + error.message, 'error');
        }
    },

    /**
     * Behandelt das Löschen eines Benutzers.
     * @param {Event} event - Das Formular-Submit-Event
     */
    async handleDeleteUser(event) {
        event.preventDefault();
        
        const userId = event.target.dataset.userId;
        if (!userId) {
            Utils.showAlert('Benutzer-ID fehlt', 'error');
            return;
        }

        try {
            await Utils.apiCall(`/admin/users/${userId}`, {
                method: 'DELETE'
            });
            
            Utils.showAlert('Benutzer erfolgreich gelöscht', 'success');
            Modals.closeModal('deleteUserModal');
            this.loadDashboard(); // Dashboard neu laden
        } catch (error) {
            console.error('Admin: Benutzer-Lösch-Fehler:', error);
            Utils.showAlert('Fehler beim Löschen des Benutzers: ' + error.message, 'error');
        }
    },

    /**
     * Führt Datenbankwartung durch.
     */
    async performMaintenance() {
        if (!this.validateAdminAccess()) return;
        
        try {
            await Utils.apiCall('/admin/maintenance', { method: 'POST' });
            Utils.showAlert('Wartung erfolgreich durchgeführt', 'success');
        } catch (error) {
            console.error('Admin: Wartungs-Fehler:', error);
            Utils.showAlert('Fehler bei der Wartung: ' + error.message, 'error');
        }
    },

    /**
     * Erstellt ein Datenbank-Backup.
     */
    async createBackup() {
        if (!this.validateAdminAccess()) return;
        
        try {
            const backup = await Utils.apiCall('/admin/backup', { method: 'POST' });
            if (backup && backup.filename) {
                Utils.showAlert(`Backup erstellt: ${backup.filename}`, 'success');
            } else {
                Utils.showAlert('Backup erfolgreich erstellt', 'success');
            }
        } catch (error) {
            console.error('Admin: Backup-Fehler:', error);
            Utils.showAlert('Fehler beim Erstellen des Backups: ' + error.message, 'error');
        }
    },
    
    /**
     * Überprüft, ob der aktuelle Benutzer Admin-Zugriff hat und gibt bei fehlendem Zugriff eine Warnung aus.
     * @returns {boolean} - True, wenn der Zugriff validiert wurde.
     */
    validateAdminAccess() {
        if (!Auth.isAuthenticated()) {
            Utils.showAlert('Sie müssen angemeldet sein, um dies zu tun.', 'error');
            return false;
        }
        
        if (!Auth.isAdmin()) {
            Utils.showAlert('Keine Admin-Berechtigung', 'error');
            return false;
        }
        
        return true;
    },

    /**
     * Zeigt das Modal zum Zurücksetzen des Passworts an.
     * @param {string} userId - Die ID des Benutzers
     */
    showPasswordResetModal(userId) {
        const modal = document.getElementById('adminPasswordResetModal');
        if (modal) {
            const form = document.getElementById('adminPasswordResetForm');
            if (form) {
                form.dataset.userId = userId;
                form.reset();
            }
            Modals.showModal('adminPasswordResetModal');
        }
    },

    /**
     * Zeigt das Modal zum Löschen eines Benutzers an.
     * @param {string} userId - Die ID des Benutzers
     */
    showDeleteUserModal(userId) {
        const modal = document.getElementById('deleteUserModal');
        if (modal) {
            const form = document.getElementById('deleteUserForm');
            if (form) {
                form.dataset.userId = userId;
            }
            Modals.showModal('deleteUserModal');
        }
    }
};
