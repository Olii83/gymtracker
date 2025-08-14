// Profilmodul für Gym Tracker - Überarbeitete Version
// Verwaltet die Anzeige, Bearbeitung und Exportfunktion des Benutzerprofils.

const Profile = {
    // Zustandsvariablen
    userProfile: null,

    /**
     * Initialisiert das Profilmodul.
     */
    init() {
        console.log('Profile: Modul initialisiert');
        this.setupEventListeners();
    },

    /**
     * Richtet Event-Listener für Profil-Formulare ein.
     */
    setupEventListeners() {
        const updateProfileForm = document.getElementById('updateProfileForm');
        if (updateProfileForm) {
            updateProfileForm.addEventListener('submit', this.handleUpdateProfile.bind(this));
        }

        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', this.handleChangePassword.bind(this));
        }
        
        const exportButton = document.getElementById('exportProfileDataButton');
        if (exportButton) {
            exportButton.addEventListener('click', this.exportUserData.bind(this));
        }
    },
    
    /**
     * Lädt die Profildaten des aktuellen Benutzers.
     */
    loadProfile() {
        this.userProfile = Auth.getCurrentUser();
        if (this.userProfile) {
            this.displayProfile(this.userProfile);
            this.populateForm(this.userProfile);
        } else {
            console.error('Profile: Kein eingeloggter Benutzer gefunden.');
        }
    },

    /**
     * Zeigt die Profildaten auf der Seite an.
     * @param {object} profileData - Die Benutzerprofildaten.
     */
    displayProfile(profileData) {
        const profileDisplayContainer = document.getElementById('profileDisplay');
        if (profileDisplayContainer) {
            profileDisplayContainer.innerHTML = `
                <p><strong>Benutzername:</strong> ${profileData.username}</p>
                <p><strong>E-Mail:</strong> ${profileData.email}</p>
                <p><strong>Rolle:</strong> ${profileData.role}</p>
            `;
        }
    },

    /**
     * Füllt die Profil-Formulare mit den aktuellen Daten vor.
     * @param {object} profileData - Die Benutzerprofildaten.
     */
    populateForm(profileData) {
        const updateProfileForm = document.getElementById('updateProfileForm');
        if (updateProfileForm) {
            updateProfileForm.username.value = profileData.username || '';
            updateProfileForm.email.value = profileData.email || '';
        }
    },

    /**
     * Behandelt das Absenden des Profil-Update-Formulars.
     * @param {Event} event - Das Formular-Submit-Event.
     */
    async handleUpdateProfile(event) {
        event.preventDefault();
        
        const form = event.target;
        const profileData = {
            username: form.username.value,
            email: form.email.value,
        };

        try {
            const updatedUser = await Utils.apiCall('/user/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
            
            // Annahme: API gibt aktualisierten Benutzer zurück
            Auth.currentUser = updatedUser;
            Utils.setLocalStorage('currentUser', updatedUser);
            this.userProfile = updatedUser;
            this.displayProfile(updatedUser);
            
            Utils.showAlert('Profil erfolgreich aktualisiert', 'success');
        } catch (error) {
            console.error('Profile: Update-Fehler:', error);
            Utils.showAlert('Fehler beim Aktualisieren des Profils: ' + error.message, 'error');
        }
    },

    /**
     * Behandelt das Absenden des Passwort-Änderungs-Formulars.
     * @param {Event} event - Das Formular-Submit-Event.
     */
    async handleChangePassword(event) {
        event.preventDefault();
        
        const form = event.target;
        const currentPassword = form.currentPassword.value;
        const newPassword = form.newPassword.value;
        const confirmPassword = form.confirmPassword.value;
        
        if (newPassword !== confirmPassword) {
            Utils.showAlert('Neue Passwörter stimmen nicht überein', 'error');
            return;
        }

        try {
            await Utils.apiCall('/user/change-password', {
                method: 'PUT',
                body: JSON.stringify({ currentPassword, newPassword })
            });
            
            Utils.showAlert('Passwort erfolgreich geändert', 'success');
            form.reset(); // Formular zurücksetzen
        } catch (error) {
            console.error('Profile: Passwort-Änderungsfehler:', error);
            Utils.showAlert('Fehler beim Ändern des Passworts: ' + error.message, 'error');
        }
    },

    /**
     * Exportiert die Benutzerdaten als JSON-Datei.
     */
    async exportUserData() {
        try {
            const data = await Utils.apiCall('/user/export');
            const filename = `gym-tracker-profile-${Utils.getCurrentDate()}.json`;
            Utils.downloadJSON(data, filename);
            Utils.showAlert('Profildaten exportiert', 'success');
        } catch (error) {
            console.error('Profile: Export-Fehler:', error);
            Utils.showAlert('Fehler beim Exportieren der Daten: ' + error.message, 'error');
        }
    },

    /**
     * Zeigt das Profil-Modal an.
     */
    showModal() {
        Modals.showModal('profileModal');
        this.loadProfile(); // Lade die neuesten Daten, bevor das Modal geöffnet wird
    },

    /**
     * Schließt das Profil-Modal.
     */
    closeModal() {
        Modals.closeModal('profileModal');
    }
};
