// Profile module for Gym Tracker
// Save as: public/js/profile.js

const Profile = {
    // Initialize profile module
    init() {
        console.log('Profile module initialized');
        this.setupEventListeners();
    },

    // Setup event listeners
    setupEventListeners() {
        // Profile update form
        const updateProfileForm = document.getElementById('updateProfileForm');
        if (updateProfileForm) {
            updateProfileForm.addEventListener('submit', this.handleUpdateProfile.bind(this));
        }

        // Password change form
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', this.handleChangePassword.bind(this));
        }
    },

    // Load user profile data
    async loadProfile() {
        try {
            const profile = await Utils.apiCall('/user/profile');
            return profile;
        } catch (error) {
            console.error('Load profile error:', error);
            Utils.showAlert('Fehler beim Laden des Profils: ' + error.message, 'error');
            throw error;
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
        
        const formData = new FormData(event.target);
        const profileData = {
            username: formData.get('username'),
            email: formData.get('email'),
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name')
        };
        
        const errors = this.validateProfileData(profileData);
        if (errors.length > 0) {
            Utils.showAlert(errors.join(', '), 'error');
            return;
        }
        
        try {
            await this.updateProfile(profileData);
            
            // Update current user data
            const currentUser = Auth.getCurrentUser();
            if (currentUser) {
                currentUser.username = profileData.username;
                currentUser.email = profileData.email;
                currentUser.first_name = profileData.first_name;
                currentUser.last_name = profileData.last_name;
                Utils.setCurrentUser(currentUser);
                if (Auth.updateWelcomeMessage) {
                    Auth.updateWelcomeMessage();
                }
            }
        } catch (error) {
            // Error already handled in updateProfile
        }
    },

    // Handle password change form submission
    async handlePasswordChange(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const passwordData = {
            currentPassword: formData.get('currentPassword'),
            newPassword: formData.get('newPassword'),
            confirmNewPassword: formData.get('confirmNewPassword')
        };
        
        const errors = this.validatePasswordData(passwordData);
        if (errors.length > 0) {
            Utils.showAlert(errors.join(', '), 'error');
            return;
        }
        
        try {
            await this.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            
            // Clear form
            event.target.reset();
        } catch (error) {
            // Error already handled in changePassword
        }
    },

    // Validate profile data
    validateProfileData(data) {
        const errors = [];
        
        if (!data.username || data.username.trim().length < 3) {
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
    }
};
