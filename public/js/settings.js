// Settings module for Gym Tracker
// This file should be saved as: public/js/settings.js

const Settings = {
    // Default settings
    defaultSettings: {
        theme: 'light',
        language: 'de',
        units: 'metric',
        notifications: true,
        autoSave: true,
        defaultRestTime: 90,
        dateFormat: 'DD.MM.YYYY',
        timeFormat: '24h'
    },

    // Current settings
    currentSettings: {},

    // Initialize settings module
    init() {
        this.loadSettings();
        this.setupEventListeners();
        console.log('Settings module initialized');
    },

    // Setup event listeners
    setupEventListeners() {
        // Theme change
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.changeTheme(e.target.value);
            });
        }

        // Language change
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        }

        // Units change
        const unitsSelect = document.getElementById('unitsSelect');
        if (unitsSelect) {
            unitsSelect.addEventListener('change', (e) => {
                this.changeUnits(e.target.value);
            });
        }
    },

    // Load settings from localStorage
    loadSettings() {
        const savedSettings = Utils.getLocalStorage('gym-tracker-settings', {});
        this.currentSettings = { ...this.defaultSettings, ...savedSettings };
        this.applySettings();
    },

    // Save settings to localStorage
    saveSettings() {
        Utils.setLocalStorage('gym-tracker-settings', this.currentSettings);
        Utils.showAlert('Einstellungen gespeichert', 'success');
    },

    // Apply current settings to the interface
    applySettings() {
        this.applyTheme(this.currentSettings.theme);
        this.applyLanguage(this.currentSettings.language);
        this.updateSettingsForm();
    },

    // Update settings form with current values
    updateSettingsForm() {
        const elements = {
            themeSelect: document.getElementById('themeSelect'),
            languageSelect: document.getElementById('languageSelect'),
            unitsSelect: document.getElementById('unitsSelect'),
            notificationsToggle: document.getElementById('notificationsToggle'),
            autoSaveToggle: document.getElementById('autoSaveToggle'),
            defaultRestTime: document.getElementById('defaultRestTime')
        };

        Object.keys(elements).forEach(key => {
            const element = elements[key];
            const settingKey = key.replace('Select', '').replace('Toggle', '');
            
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.currentSettings[settingKey];
                } else {
                    element.value = this.currentSettings[settingKey];
                }
            }
        });
    },

    // Change theme
    changeTheme(theme) {
        this.currentSettings.theme = theme;
        this.applyTheme(theme);
        this.saveSettings();
    },

    // Apply theme to document
    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        
        if (theme === 'dark') {
            this.enableDarkMode();
        } else if (theme === 'light') {
            this.enableLightMode();
        } else if (theme === 'auto') {
            this.enableAutoMode();
        }
    },

    // Enable dark mode
    enableDarkMode() {
        document.documentElement.style.setProperty('--white', '#1a1a1a');
        document.documentElement.style.setProperty('--light-gray', '#2d2d2d');
        document.documentElement.style.setProperty('--gray', '#404040');
        document.documentElement.style.setProperty('--dark-gray', '#a0a0a0');
        document.documentElement.style.setProperty('--dark', '#ffffff');
        document.documentElement.style.setProperty('--bg-overlay', 'rgba(45, 45, 45, 0.95)');
        document.documentElement.style.setProperty('--bg-card', 'rgba(45, 45, 45, 0.98)');
        
        document.body.style.background = 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)';
    },

    // Enable light mode
    enableLightMode() {
        document.documentElement.style.setProperty('--white', '#ffffff');
        document.documentElement.style.setProperty('--light-gray', '#f8f9fa');
        document.documentElement.style.setProperty('--gray', '#e9ecef');
        document.documentElement.style.setProperty('--dark-gray', '#6c757d');
        document.documentElement.style.setProperty('--dark', '#333333');
        document.documentElement.style.setProperty('--bg-overlay', 'rgba(255, 255, 255, 0.95)');
        document.documentElement.style.setProperty('--bg-card', 'rgba(255, 255, 255, 0.98)');
        
        document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    },

    // Enable auto mode (follows system preference)
    enableAutoMode() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            this.enableDarkMode();
        } else {
            this.enableLightMode();
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this.currentSettings.theme === 'auto') {
                if (e.matches) {
                    this.enableDarkMode();
                } else {
                    this.enableLightMode();
                }
            }
        });
    },

    // Change language
    changeLanguage(language) {
        this.currentSettings.language = language;
        this.applyLanguage(language);
        this.saveSettings();
    },

    // Apply language to interface
    applyLanguage(language) {
        document.documentElement.lang = language;
        // Here you would implement actual language switching
        // For now, we'll just store the preference
    },

    // Change units (metric/imperial)
    changeUnits(units) {
        this.currentSettings.units = units;
        this.saveSettings();
        Utils.showAlert(`Einheiten geändert zu: ${units === 'metric' ? 'Metrisch' : 'Imperial'}`, 'info');
    },

    // Toggle notifications
    toggleNotifications(enabled) {
        this.currentSettings.notifications = enabled;
        this.saveSettings();
        
        if (enabled) {
            this.requestNotificationPermission();
        }
    },

    // Request notification permission
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                Utils.showAlert('Benachrichtigungen aktiviert', 'success');
            } else {
                Utils.showAlert('Benachrichtigungen verweigert', 'warning');
                this.currentSettings.notifications = false;
                this.saveSettings();
            }
        }
    },

    // Show notification
    showNotification(title, options = {}) {
        if (this.currentSettings.notifications && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                ...options
            });
        }
    },

    // Toggle auto-save
    toggleAutoSave(enabled) {
        this.currentSettings.autoSave = enabled;
        this.saveSettings();
        Utils.showAlert(`Auto-Speichern ${enabled ? 'aktiviert' : 'deaktiviert'}`, 'info');
    },

    // Set default rest time
    setDefaultRestTime(seconds) {
        this.currentSettings.defaultRestTime = parseInt(seconds);
        this.saveSettings();
    },

    // Get setting value
    get(key) {
        return this.currentSettings[key] || this.defaultSettings[key];
    },

    // Set setting value
    set(key, value) {
        this.currentSettings[key] = value;
        this.saveSettings();
    },

    // Reset all settings to defaults
    resetToDefaults() {
        if (confirm('Möchten Sie alle Einstellungen auf die Standardwerte zurücksetzen?')) {
            this.currentSettings = { ...this.defaultSettings };
            this.applySettings();
            this.saveSettings();
            Utils.showAlert('Einstellungen zurückgesetzt', 'info');
        }
    },

    // Export settings
    exportSettings() {
        const filename = `gym-tracker-settings-${new Date().toISOString().split('T')[0]}.json`;
        Utils.downloadJSON(this.currentSettings, filename);
        Utils.showAlert('Einstellungen exportiert', 'success');
    },

    // Import settings
    importSettings(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedSettings = JSON.parse(e.target.result);
                this.currentSettings = { ...this.defaultSettings, ...importedSettings };
                this.applySettings();
                this.saveSettings();
                Utils.showAlert('Einstellungen importiert', 'success');
            } catch (error) {
                Utils.showAlert('Fehler beim Importieren der Einstellungen', 'error');
            }
        };
        reader.readAsText(file);
    },

    // Show delete account modal
    showDeleteAccountModal() {
        if (document.getElementById('deleteAccountModal')) {
            document.getElementById('deleteAccountModal').style.display = 'block';
        } else {
            // Create modal if it doesn't exist
            this.createDeleteAccountModal();
        }
    },

    // Create delete account modal
    createDeleteAccountModal() {
        const modal = document.createElement('div');
        modal.id = 'deleteAccountModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">🗑️ Konto löschen</h2>
                    <span class="close" onclick="Settings.closeDeleteAccountModal()">&times;</span>
                </div>
                
                <div class="modal-body">
                    <div class="warning-box">
                        <div class="warning-icon">⚠️</div>
                        <div class="warning-content">
                            <h3>WARNUNG: Diese Aktion kann nicht rückgängig gemacht werden!</h3>
                            <p>Alle Ihre Daten, Trainings und Fortschritte werden permanent gelöscht.</p>
                        </div>
                    </div>
                    
                    <form id="deleteAccountForm" onsubmit="Settings.handleDeleteAccount(event)">
                        <div class="form-group">
                            <label for="deleteConfirmation">Geben Sie "LÖSCHEN" ein, um zu bestätigen:</label>
                            <input type="text" id="deleteConfirmation" required placeholder="LÖSCHEN" class="confirmation-input">
                        </div>
                        
                        <div class="form-group">
                            <label for="deletePassword">Ihr aktuelles Passwort:</label>
                            <input type="password" id="deletePassword" required placeholder="Passwort zur Bestätigung">
                        </div>
                        
                        <div class="modal-actions">
                            <button type="submit" class="btn btn-danger">🗑️ Konto endgültig löschen</button>
                            <button type="button" class="btn btn-secondary" onclick="Settings.closeDeleteAccountModal()">❌ Abbrechen</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
    },

    // Close delete account modal
    closeDeleteAccountModal() {
        const modal = document.getElementById('deleteAccountModal');
        if (modal) {
            modal.style.display = 'none';
            modal.remove();
        }
    },

    // Handle delete account
    async handleDeleteAccount(event) {
        event.preventDefault();
        
        const confirmation = document.getElementById('deleteConfirmation').value;
        const password = document.getElementById('deletePassword').value;
        
        if (confirmation !== 'LÖSCHEN') {
            Utils.showAlert('Bitte geben Sie "LÖSCHEN" ein, um zu bestätigen', 'error');
            return;
        }
        
        if (!password) {
            Utils.showAlert('Passwort erforderlich', 'error');
            return;
        }
        
        try {
            await Profile.deleteAccount(confirmation);
        } catch (error) {
            // Error already handled in Profile.deleteAccount
        }
    },

    // Get current settings
    getCurrentSettings() {
        return { ...this.currentSettings };
    },

    // Check if dark mode is enabled
    isDarkMode() {
        return this.currentSettings.theme === 'dark' || 
               (this.currentSettings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    },

    // Check if notifications are enabled
    areNotificationsEnabled() {
        return this.currentSettings.notifications && 'Notification' in window && Notification.permission === 'granted';
    },

    // Format date according to user preference
    formatDate(date) {
        const format = this.currentSettings.dateFormat;
        const dateObj = new Date(date);
        
        switch (format) {
            case 'MM/DD/YYYY':
                return dateObj.toLocaleDateString('en-US');
            case 'YYYY-MM-DD':
                return dateObj.toISOString().split('T')[0];
            case 'DD.MM.YYYY':
            default:
                return dateObj.toLocaleDateString('de-DE');
        }
    },

    // Format time according to user preference
    formatTime(time) {
        const format = this.currentSettings.timeFormat;
        const timeObj = new Date(`1970-01-01T${time}`);
        
        return format === '12h' ? 
            timeObj.toLocaleTimeString('en-US', { hour12: true }) :
            timeObj.toLocaleTimeString('de-DE', { hour12: false });
    }
};
