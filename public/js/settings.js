// Settings module for Gym Tracker
// Save as: public/js/settings.js

const Settings = {
    // Default settings
    defaultSettings: {
        theme: 'light',
        language: 'de',
        units: 'metric',
        notifications: true,
        autoSave: true,
        defaultRestTime: 90
    },

    // Current settings
    currentSettings: {},

    // Initialize settings module
    init() {
        console.log('Settings module initialized');
        this.loadSettings();
        this.setupEventListeners();
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
    },

    // Apply current settings to the interface
    applySettings() {
        this.applyTheme(this.currentSettings.theme);
        this.updateSettingsForm();
    },

    // Update settings form with current values
    updateSettingsForm() {
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = this.currentSettings.theme;
        }
    },

    // Change theme
    changeTheme(theme) {
        console.log('Changing theme to:', theme);
        this.currentSettings.theme = theme;
        this.applyTheme(theme);
        this.saveSettings();
        Utils.showAlert(`Design geändert zu: ${theme}`, 'info');
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

    // Show delete account modal
    showDeleteAccountModal() {
        Utils.showAlert('Konto-Löschung ist nur über den Admin-Bereich verfügbar', 'info');
    },

    // Check if dark mode is enabled
    isDarkMode() {
        return this.currentSettings.theme === 'dark' || 
               (this.currentSettings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
};
