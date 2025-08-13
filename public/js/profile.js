// Profilmodul für Gym Tracker

const Profile = {
    /**
     * Initialisiert das Profilmodul
     */
    init() {
        console.log('Profile: Modul initialisiert');
        this.setupEventListeners();
        this.createModals();
    },

    /**
     * Richtet Event-Listener ein
     */
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Profil-Update-Formular
            const updateProfileForm = document.getElementById('updateProfileForm');
            if (updateProfileForm) {
                updateProfileForm.addEventListener('submit', this.handleUpdateProfile.bind(this));
            }

            // Passwort-Änderung-Formular
            const changePasswordForm = document.getElementById('changePasswordForm');
            if (changePasswordForm) {
                changePasswordForm.addEventListener('submit', this.handleChangePassword.bind(this));
            }
        });
    },

    /**
     * Erstellt Modal-HTML für Profil-Bearbeitung
     */
    createModals() {
        const modalHTML = `
            <!-- Profil-Bearbeitungs-Modal -->
            <div id="profileModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Profil bearbeiten</h2>
                        <button class="close" onclick="Profile.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <!-- Profil-Update-Formular -->
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
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-success">Profil speichern</button>
                                <button type="button" class="btn btn-outline" onclick="Profile.closeModal()">Abbrechen</button>
                            </div>
                        </form>
                        
                        <!-- Trennlinie -->
                        <div style="margin: 30px 0; border-top: 1px solid var(--border-color);"></div>
                        
                        <!-- Passwort-Änderung -->
                        <h3>Passwort ändern</h3>
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
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-warning">Passwort ändern</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Modal zu Seite hinzufügen
        let container = document.getElementById('modals-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modals-container';
            document.body.appendChild(container);
        }
        container.innerHTML += modalHTML;
    },

    /**
     * Zeigt Profil-Modal an
     */
    showModal() {
        console.log('Profile: Öffne Profil-Modal...');
        this.loadProfileData();
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'block';
        } else {
            console.error('Profile: Profil-Modal nicht gefunden!');
        }
    },

    /**
     * Schließt Profil-Modal
     */
    closeModal() {
        console.log('Profile: Schließe Profil-Modal...');
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.resetForms();
    },

    /**
     * Setzt Formulare zurück
     */
    resetForms() {
        const updateForm = document.getElementById('updateProfileForm');
        const passwordForm = document.getElementById('changePasswordForm');
        
        if (updateForm) updateForm.reset();
        if (passwordForm) passwordForm.reset();
    },

    /**
     * Lädt Benutzerprofil-Daten in das Formular
     */
    async loadProfileData() {
        try {
            const user = Auth.getCurrentUser();
            if (user) {
                // Formularfelder mit Benutzerdaten füllen
                const fields = {
                    profileFirstName: user.first_name || '',
                    profileLastName: user.last_name || '',
                    profileUsername: user.username || '',
                    profileEmail: user.email || ''
                };

                // Felder setzen
                Object.entries(fields).forEach(([fieldId, value]) => {
                    const field = document.getElementById(fieldId);
                    if (field) field.value = value;
                });

                console.log('Profile: Profildaten geladen:', user.username);
            }
        } catch (error) {
            console.error('Profile: Fehler beim Laden der Profildaten:', error);
            Utils.showAlert('Fehler beim Laden der Profildaten', 'error');
        }
    },

    /**
     * Aktualisiert Benutzerprofil via API
     * @param {object} profileData - Neue Profildaten
     * @returns {Promise<boolean>} - Erfolgsstatus
     */
    async updateProfile(profileData) {
        try {
            await Utils.apiCall('/user/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
            
            Utils.showAlert('Profil erfolgreich aktualisiert!', 'success');
            return true;
        } catch (error) {
            console.error('Profile: Profil-Update-Fehler:', error);
            Utils.showAlert('Fehler beim Aktualisieren des Profils: ' + error.message, 'error');
            throw error;
        }
    },

    /**
     * Ändert Benutzerpasswort via API
     * @param {object} passwordData - Passwort-Daten
     * @returns {Promise<boolean>} - Erfolgsstatus
     */
    async changePassword(passwordData) {
        try {
            await Utils.apiCall('/user/password', {
                method: 'PUT',
                body: JSON.stringify(passwordData)
            });
            
            Utils.showAlert('Passwort erfolgreich geändert!', 'success');
            return true;
        } catch (error) {
            console.error('Profile: Passwort-Änderungs-Fehler:', error);
            Utils.showAlert('Fehler beim Ändern des Passworts: ' + error.message, 'error');
            throw error;
        }
    },

    /**
     * Behandelt Profil-Update-Formular-Einreichung
     * @param {Event} event - Form-Submit-Event
     */
    async handleUpdateProfile(event) {
        event.preventDefault();
        console.log('Profile: Behandle Profil-Update...');
        
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            // Button-Zustand während Request ändern
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading"></div> Speichern...';
            
            // Formulardaten sammeln
            const formData = new FormData(event.target);
            const profileData = {
                username: formData.get('username')?.trim(),
                email: formData.get('email')?.trim(),
                first_name: formData.get('first_name')?.trim() || null,
                last_name: formData.get('last_name')?.trim() || null
            };
            
            // Validierung
            if (!profileData.username) {
                throw new Error('Benutzername ist erforderlich');
            }
            
            if (!profileData.email || !Utils.isValidEmail(profileData.email)) {
                throw new Error('Gültige E-Mail-Adresse ist erforderlich');
            }
            
            // Profil aktualisieren
            await this.updateProfile(profileData);
            
            // Aktuelle Benutzerdaten aktualisieren
            const currentUser = Auth.getCurrentUser();
            if (currentUser) {
                Object.assign(currentUser, profileData);
                Utils.setCurrentUser(currentUser);
                
                // Begrüßungsnachricht aktualisieren
                if (Auth.updateWelcomeMessage) {
                    Auth.updateWelcomeMessage();
                }
            }
            
            this.closeModal();
        } catch (error) {
            console.error('Profile: Profil-Update fehlgeschlagen:', error);
        } finally {
            // Button-Zustand zurücksetzen
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    /**
     * Behandelt Passwort-Änderungs-Formular-Einreichung
     * @param {Event} event - Form-Submit-Event
     */
    async handleChangePassword(event) {
        event.preventDefault();
        console.log('Profile: Behandle Passwort-Änderung...');
        
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            // Button-Zustand während Request ändern
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading"></div> Ändern...';
            
            // Formulardaten sammeln
            const formData = new FormData(event.target);
            const currentPassword = formData.get('currentPassword');
            const newPassword = formData.get('newPassword');
            const confirmPassword = formData.get('confirmNewPassword');
            
            // Validierung
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
            
            // Passwort-Daten für API
            const passwordData = {
                currentPassword: currentPassword,
                newPassword: newPassword
            };
            
            // Passwort ändern
            await this.changePassword(passwordData);
            
            // Passwort-Formular zurücksetzen
            event.target.reset();
            
        } catch (error) {
            console.error('Profile: Passwort-Änderung fehlgeschlagen:', error);
            Utils.showAlert(error.message, 'error');
        } finally {
            // Button-Zustand zurücksetzen
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    /**
     * Validiert Profildaten
     * @param {object} data - Zu validierende Profildaten
     * @returns {string[]} - Array von Fehlermeldungen
     */
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

    /**
     * Exportiert Benutzerdaten
     */
    async exportUserData() {
        try {
            const data = await Utils.apiCall('/user/export');
            const filename = `gym-tracker-profile-${new Date().toISOString().split('T')[0]}.json`;
            Utils.downloadJSON(data, filename);
            Utils.showAlert('Profildaten exportiert', 'success');
        } catch (error) {
            console.error('Profile: Export-Fehler:', error);
            Utils.showAlert('Fehler beim Exportieren der Daten: ' + error.message, 'error');
        }
    },

    /**
     * Gibt aktuelle Profildaten zurück
     * @returns {object|null} - Profildaten oder null
     */
    getCurrentProfileData() {
        return Auth.getCurrentUser();
    },

    /**
     * Prüft ob Profil vollständig ist
     * @returns {boolean} - Vollständig oder nicht
     */
    isProfileComplete() {
        const user = Auth.getCurrentUser();
        return user && user.username && user.email;
    },

    /**
     * Zeigt Vervollständigungs-Erinnerung an
     */
    showCompletionReminder() {
        if (!this.isProfileComplete()) {
            Utils.showAlert('Bitte vervollständigen Sie Ihr Profil', 'info');
            setTimeout(() => this.showModal(), 1000);
        }
    }
};

// Globale Funktionen für Rückwärtskompatibilität
window.showProfileModal = function() {
    Profile.showModal();
};

window.closeProfileModal = function() {
    Profile.closeModal();
};