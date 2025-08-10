// Admin module for Gym Tracker

const Admin = {
    // State
    users: [],
    stats: null,

    // Initialize admin module
    init() {
        this.setupEventListeners();
    },

    // Setup event listeners
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

    // Load admin dashboard
    async loadDashboard() {
        if (!Auth.isAdmin()) {
            Utils.showAlert('Keine Admin-Berechtigung', 'error');
            App.showSection('dashboard');
            return;
        }

        try {
            const [users, stats] = await Promise.all([
                Utils.apiCall('/admin/users'),
                Utils.apiCall('/admin/stats')
            ]);
            
            this.users = users || [];
            this.stats = stats || {};
            
            this.displayStats(this.stats);
            this.displayUsersTable(this.users);
        } catch (error) {
            console.error('Admin dashboard load error:', error);
            Utils.showAlert('Fehler beim Laden der Admin-Daten: ' + error.message, 'error');
        }
    },

    // Display admin statistics
    displayStats(stats) {
        const elements = {
            totalUsers: document.getElementById('totalUsers'),
            activeUsers: document.getElementById('activeUsers'),
            totalAdminWorkouts: document.getElementById('totalAdminWorkouts')
        };

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

    // Display users table
    displayUsersTable(users) {
        const tbody = document.getElementById('userTableBody');
        if (!tbody) return;
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Keine Benutzer gefunden</td></tr>';
            return;
        }
        
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
                            🔑
                        </button>
                        <button class="btn ${user.is_active ? 'btn-danger' : 'btn-success'}" 
                                onclick="Admin.toggleUserStatus(${user.id}, ${!user.is_active})" 
                                title="${user.is_active ? 'Deaktivieren' : 'Aktivieren'}">
                            ${user.is_active ? '🚫' : '✅'}
                        </button>
                        ${user.id !== Auth.getCurrentUser().id ? `
                            <button class="btn btn-danger" onclick="Admin.showDeleteUserModal(${user.id}, '${Utils.sanitizeInput(user.username)}')" title="Benutzer löschen">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    },

    // Toggle user status (active/inactive)
    async toggleUserStatus(userId, activate) {
        try {
            await Utils.apiCall(`/admin/users/${userId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: activate })
            });
            
            Utils.showAlert(`Benutzer ${activate ? 'aktiviert' : 'deaktiviert'}`, 'success');
            this.loadDashboard();
        } catch (error) {
            console.error('Toggle user status error:', error);
            Utils.showAlert('Fehler beim Ändern des Benutzerstatus: ' + error.message, 'error');
        }
    },

    // Show password reset modal
    showPasswordResetModal(userId, username) {
        document.getElementById('resetUserId').value = userId;
        document.getElementById('resetUsername').textContent = username;
        document.getElementById('passwordResetModal').style.display = 'block';
    },

    // Close password reset modal
    closePasswordResetModal() {
        document.getElementById('passwordResetModal').style.display = 'none';
        document.getElementById('adminPasswordResetForm').reset();
    },

    // Handle password reset
    async handlePasswordReset(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <span style="display: none;">Passwort zurücksetzen</span>
                <div class="loading" style="margin-left: 10px; display: inline-block;"></div>
            `;
            
            const newPassword = document.getElementById('adminNewPassword').value;
            const confirmPassword = document.getElementById('adminConfirmPassword').value;
            const userId = document.getElementById('resetUserId').value;
            
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
            
            await Utils.apiCall(`/admin/users/${userId}/reset-password`, {
                method: 'POST',
                body: JSON.stringify({ newPassword })
            });
            
            Utils.showAlert('Passwort erfolgreich zurückgesetzt', 'success');
            this.closePasswordResetModal();
        } catch (error) {
            console.error('Password reset error:', error);
            Utils.showAlert('Fehler beim Zurücksetzen des Passworts: ' + error.message, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    // Show delete user modal
    showDeleteUserModal(userId, username) {
        document.getElementById('deleteUserId').value = userId;
        document.getElementById('deleteUsername').textContent = username;
        document.getElementById('deleteUserModal').style.display = 'block';
    },

    // Close delete user modal
    closeDeleteUserModal() {
        document.getElementById('deleteUserModal').style.display = 'none';
        document.getElementById('deleteUserForm').reset();
    },

    // Handle user deletion
    async handleDeleteUser(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <span style="display: none;">Benutzer löschen</span>
                <div class="loading" style="margin-left: 10px; display: inline-block;"></div>
            `;
            
            const confirmation = document.getElementById('deleteConfirmation').value;
            const userId = document.getElementById('deleteUserId').value;
            
            if (confirmation !== 'LÖSCHEN') {
                throw new Error('Bitte geben Sie "LÖSCHEN" ein, um zu bestätigen');
            }

            // Check if trying to delete own account
            if (parseInt(userId) === Auth.getCurrentUser().id) {
                throw new Error('Sie können Ihr eigenes Konto nicht löschen');
            }
            
            await Utils.apiCall(`/admin/users/${userId}`, {
                method: 'DELETE'
            });
            
            Utils.showAlert('Benutzer erfolgreich gelöscht', 'success');
            this.closeDeleteUserModal();
            this.loadDashboard();
        } catch (error) {
            console.error('Delete user error:', error);
            Utils.showAlert('Fehler beim Löschen des Benutzers: ' + error.message, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    // Delete user
    async deleteUser(userId) {
        try {
            await Utils.apiCall(`/admin/users/${userId}`, {
                method: 'DELETE'
            });
            
            Utils.showAlert('Benutzer erfolgreich gelöscht', 'success');
            this.loadDashboard();
        } catch (error) {
            console.error('Delete user error:', error);
            Utils.showAlert('Fehler beim Löschen des Benutzers: ' + error.message, 'error');
            throw error;
        }
    },

    // Get user by ID
    getUserById(userId) {
        return this.users.find(u => u.id === userId);
    },

    // Search users
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

    // Filter users by status
    filterUsersByStatus(isActive) {
        return this.users.filter(user => user.is_active === isActive);
    },

    // Filter users by role
    filterUsersByRole(role) {
        return this.users.filter(user => user.role === role);
    },

    // Get user statistics
    getUserStats() {
        if (!this.users.length) return null;

        const activeUsers = this.users.filter(u => u.is_active).length;
        const inactiveUsers = this.users.length - activeUsers;
        const adminUsers = this.users.filter(u => u.role === 'admin').length;
        const regularUsers = this.users.length - adminUsers;

        // Calculate registration trends (last 30 days)
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

    // Export users data
    exportUsers() {
        if (!this.users.length) {
            Utils.showAlert('Keine Benutzerdaten zum Exportieren', 'warning');
            return;
        }

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

    // Create user (for future use)
    async createUser(userData) {
        try {
            await Utils.apiCall('/admin/users', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            
            Utils.showAlert('Benutzer erfolgreich erstellt', 'success');
            this.loadDashboard();
        } catch (error) {
            console.error('Create user error:', error);
            Utils.showAlert('Fehler beim Erstellen des Benutzers: ' + error.message, 'error');
            throw error;
        }
    },

    // Update user (for future use)
    async updateUser(userId, userData) {
        try {
            await Utils.apiCall(`/admin/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
            
            Utils.showAlert('Benutzer erfolgreich aktualisiert', 'success');
            this.loadDashboard();
        } catch (error) {
            console.error('Update user error:', error);
            Utils.showAlert('Fehler beim Aktualisieren des Benutzers: ' + error.message, 'error');
            throw error;
        }
    },

    // Send system message to user (for future use)
    async sendSystemMessage(userId, message) {
        try {
            await Utils.apiCall(`/admin/users/${userId}/message`, {
                method: 'POST',
                body: JSON.stringify({ message })
            });
            
            Utils.showAlert('Nachricht gesendet', 'success');
        } catch (error) {
            console.error('Send message error:', error);
            Utils.showAlert('Fehler beim Senden der Nachricht: ' + error.message, 'error');
            throw error;
        }
    },

    // Get system logs (for future use)
    async getSystemLogs(limit = 100) {
        try {
            const logs = await Utils.apiCall(`/admin/logs?limit=${limit}`);
            return logs || [];
        } catch (error) {
            console.error('Get logs error:', error);
            Utils.showAlert('Fehler beim Laden der Logs: ' + error.message, 'error');
            return [];
        }
    },

    // Clear cached data
    clearCache() {
        this.users = [];
        this.stats = null;
    },

    // Get admin data
    getUsers() {
        return this.users;
    },

    getStats() {
        return this.stats;
    },

    // Validate admin permissions
    validateAdminAccess() {
        if (!Auth.isAuthenticated()) {
            throw new Error('Nicht angemeldet');
        }
        
        if (!Auth.isAdmin()) {
            throw new Error('Keine Admin-Berechtigung');
        }
        
        return true;
    },

    // Database maintenance (for future use)
    async performMaintenance() {
        try {
            this.validateAdminAccess();
            
            await Utils.apiCall('/admin/maintenance', {
                method: 'POST'
            });
            
            Utils.showAlert('Wartung erfolgreich durchgeführt', 'success');
        } catch (error) {
            console.error('Maintenance error:', error);
            Utils.showAlert('Fehler bei der Wartung: ' + error.message, 'error');
            throw error;
        }
    },

    // Backup database (for future use)
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
            console.error('Backup error:', error);
            Utils.showAlert('Fehler beim Erstellen des Backups: ' + error.message, 'error');
            throw error;
        }
    }
};
