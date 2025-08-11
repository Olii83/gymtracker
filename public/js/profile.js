// Profile module for Gym Tracker - Fixed with Modal functionality
// Save as: public/js/profile.js (replace existing)

const Profile = {
    // Initialize profile module
    init() {
        console.log('Profile module initialized');
        this.setupEventListeners();
        this.createModals();
    },

    // Setup event listeners
    setupEventListeners() {
        // Will be set up after DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            const updateProfileForm = document.getElementById('updateProfileForm');
            if (updateProfileForm) {
                updateProfileForm.addEventListener('submit', this.handleUpdateProfile.bind(this));
            }

            const changePasswordForm = document.getElementById('changePasswordForm');
            if (changePasswordForm) {
                changePasswordForm.addEventListener('submit', this.handleChangePassword.bind(this));
            }
        });
    },

    // Create modal HTML
    createModals() {
        const modalHTML = `
            <!-- Modal: Profile Edit -->
            <div id="profileModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">👤 Profil bearbeiten</h2>
                        <button class="close" onclick="Profile.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="updateProfileForm">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="profileFirstName">Vorname</label>
                                    <input type="text" id="profileFirstName" name="first_name" placeholder="Ihr Vorname">
                                </div>
                                
                                <div class="form-group">
                                    <label for="profileLastName">Nachname</label>
                                    <input type="text" id="profileLastName" name="last_name" placeholder="Ihr Nachname">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="profileUsername">Benutzername *</label>
                                <input type="text" id="profileUsername" name="username" required placeholder="Ihr Benutzername">
                            </div>
                            
                            <div class="form-group">
                                <label for="profileEmail">E-Mail-Adresse *</label>
                                <input type="email" id="profileEmail" name="email" required placeholder="ihre.email@domain.de">
                            </div>
                            
                            <div style="text-align: center; margin-top: 20px;">
                                <button type="submit" class="btn btn-success">💾 Profil speichern</button>
                                <button type="button" class="btn btn-outline" onclick="Profile.closeModal()">❌ Abbrechen</button>
                            </div>
                        </form>
                        
                        <hr style="margin: 30px 0;">
                        
                        <h3>🔐 Passwort ändern</h3>
                        <form id="changePasswordForm">
                            <div class="form-group">
                                <label for="currentPassword">Aktuelles Passwort *</label>
                                <input type="password" id="currentPassword" name="currentPassword" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="newPassword">Neues Passwort *</label>
                                <input type="password" id="newPassword" name="newPassword" required minlength="6">
                            </div>
                            
                            <div class="form-group">
                                <label for="confirmNewPassword">Neues Passwort bestätigen *</label>
                                <input type="password" id="confirmNewPassword" name="confirmNewPassword" required minlength="6">
                            </div>
                            
                            <div style="text-align: center; margin-top: 15px;">
                                <button type="submit" class="btn btn-warning">🔐 Passwort ändern</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page if not exists
        let container = document.getElementById('modals-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modals-container';
            document.body.appendChild(container);
        }
        container.innerHTML += modalHTML;
    },

    // Show profile modal
    showModal() {
        console.log('Opening profile modal...');
        this.loadProfileData();
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'block';
        } else {
            console.error('Profile modal not found!');
        }
    },

    // Close profile modal
    closeModal() {
        console.log('Closing profile modal...');
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.resetForms();
    },

    // Reset forms
    resetForms() {
        const updateForm = document.getElementById('updateProfileForm');
        const passwordForm = document.getElementById('changePasswordForm');
        
        if (updateForm) updateForm.reset();
        if (passwordForm) passwordForm.reset();
    },

    // Load user profile data
    async loadProfileData() {
        try {
            const user = Auth.getCurrentUser();
            if (user) {
                const firstNameField = document.getElementById('profileFirstName');
                const lastNameField = document.getElementById('profileLastName');
                const usernameField = document.getElementById('profileUsername');
                const emailField = document.getElementById('profileEmail');

                if (firstNameField) firstNameField.value = user.first_name || '';
                if (lastNameField) lastNameField.value = user.last_name || '';
                if (usernameField) usernameField.value = user.username || '';
                if (emailField) emailField.value = user.email || '';

                console.log('Profile data loaded:', user.username);
            }
        } catch (error) {
            console.error('Load profile data error:', error);
            Utils.showAlert('Fehler beim Laden der Profildaten', 'error');
        }
    },

    // Update user profile
    async updateProfile(profileData) {
        try {
            await Utils.apiCall('/user/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
            
            Utils.showAlert('Profil erfolgreich aktualisiert!', 'success');
            return true;
        } catch (error) {
            console.error('Update profile error:', error);
            Utils.showAlert('Fehler beim Aktualisieren des Profils: ' + error.message, 'error');
            throw error;
        }
    },

    // Change user password
    async changePassword(passwordData) {
        try {
            await Utils.apiCall('/user/password', {
                method: 'PUT',
                body: JSON.stringify(passwordData)
            });
            
            Utils.showAlert('Passwort erfolgreich geändert!', 'success');
            return true;
        } catch (error) {
            console.error('Change password error:', error);
            Utils.showAlert('Fehler beim Ändern des Passworts: ' + error.message, 'error');
            throw error;
        }
    },

    // Handle profile update form submission
    async handleUpdateProfile(event) {
        event.preventDefault();
        console.log('Handling profile update...');
        
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading"></div> Speichern...';
            
            const formData = new FormData(event.target);
            const profileData = {
                username: formData.get('username')?.trim(),
                email: formData.get('email')?.trim(),
                first_name: formData.get('first_name')?.trim() || null,
                last_name: formData.get('last_name')?.trim() || null
            };
            
            // Validation
            if (!profileData.username) {
                throw new Error('Benutzername ist erforderlich');
            }
            
            if (!profileData.email || !Utils.isValidEmail(profileData.email)) {
                throw new Error('Gültige E-Mail-Adresse ist erforderlich');
            }
            
            await this.updateProfile(profileData);
            
            // Update current user data
            const currentUser = Auth.getCurrentUser();
            if (currentUser) {
                Object.assign(currentUser, profileData);
                Utils.setCurrentUser(currentUser);
                if (Auth.updateWelcomeMessage) {
                    Auth.updateWelcomeMessage();
                }
            }
            
            this.closeModal();
        } catch (error) {
            console.error('Profile update failed:', error);
            // Error already shown in updateProfile
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    // Handle password change form submission
    async handleChangePassword(event) {
        event.preventDefault();
        console.log('Handling password change...');
        
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading"></div> Ändern...';
            
            const formData = new FormData(event.target);
            const currentPassword = formData.get('currentPassword');
            const newPassword = formData.get('newPassword');
            const confirmPassword = formData.get('confirmNewPassword');
            
            // Validation
            if (!currentPassword) {
                throw new Error('Aktuelles Passwort ist erforderlich');
            }
            
            if (!newPassword) {
                throw new Error('Neues Passwort ist erforderlich');
            }
            
            const passwordError = Utils.validatePassword(newPassword);
            if (passwordError) {
                throw new Error(passwordError);
            }
            
            if (newPassword !== confirmPassword) {
                throw new Error('Neue Passwörter stimmen nicht überein');
            }
            
            const passwordData = {
                currentPassword: currentPassword,
                newPassword: newPassword
            };
            
            await this.changePassword(passwordData);
            
            // Clear password form
            event.target.reset();
            
        } catch (error) {
            console.error('Password change failed:', error);
            Utils.showAlert(error.message, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    // Validate profile data
    validateProfileData(data) {
        const errors = [];
        
        if (!data.username || data.username.length < 3) {
            errors.push('Benutzername muss mindestens 3 Zeichen lang sein');
        }
        
        if (!data.email || !Utils.isValidEmail(data.email)) {
            errors.push('Gültige E-Mail-Adresse erforderlich');
        }
        
        return errors;
    },

    // Validate password change data
    validatePasswordData(data) {
        const errors = [];
        
        if (!data.currentPassword) {
            errors.push('Aktuelles Passwort erforderlich');
        }
        
        if (!data.newPassword) {
            errors.push('Neues Passwort erforderlich');
        }
        
        const passwordError = Utils.validatePassword(data.newPassword);
        if (passwordError) {
            errors.push(passwordError);
        }
        
        if (data.newPassword !== data.confirmNewPassword) {
            errors.push('Neue Passwörter stimmen nicht überein');
        }
        
        return errors;
    },

    // Export user data
    async exportUserData() {
        try {
            const data = await Utils.apiCall('/user/export');
            const filename = `gym-tracker-profile-${new Date().toISOString().split('T')[0]}.json`;
            Utils.downloadJSON(data, filename);
            Utils.showAlert('Profildaten exportiert', 'success');
        } catch (error) {
            console.error('Export user data error:', error);
            Utils.showAlert('Fehler beim Exportieren der Daten: ' + error.message, 'error');
        }
    },

    // Get current profile data
    getCurrentProfileData() {
        return Auth.getCurrentUser();
    },

    // Check if profile is complete
    isProfileComplete() {
        const user = Auth.getCurrentUser();
        return user && user.username && user.email;
    },

    // Show profile completion reminder
    showCompletionReminder() {
        if (!this.isProfileComplete()) {
            Utils.showAlert('Bitte vervollständigen Sie Ihr Profil', 'info');
            setTimeout(() => this.showModal(), 1000);
        }
    }
};

// Global function for backward compatibility
window.showProfileModal = function() {
    Profile.showModal();
};

window.closeProfileModal = function() {
    Profile.closeModal();
};
