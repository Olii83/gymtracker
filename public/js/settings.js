// Settings-Modul für Gym Tracker - Überarbeitete Version
// Verwaltet die anwendungsspezifischen Einstellungen des Benutzers.

const Settings = {
    // Standard-Einstellungen
    defaultSettings: {
        theme: 'light', // 'light', 'dark', 'auto'
        language: 'de',
        units: 'metric', // 'metric', 'imperial'
        notifications: true,
        autoSave: true,
        defaultRestTime: 90 // Sekunden
    },

    currentSettings: {},

    /**
     * Initialisiert das Einstellungsmodul.
     */
    init() {
        console.log('Settings: Modul initialisiert');
        this.loadSettings();
        this.setupEventListeners();
    },

    /**
     * Richtet Event-Listener für die Einstellungen-Formulare ein.
     */
    setupEventListeners() {
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('change', this.handleFormChange.bind(this));
        }

        const resetDefaultsButton = document.getElementById('resetSettingsButton');
        if (resetDefaultsButton) {
            resetDefaultsButton.addEventListener('click', this.resetToDefaults.bind(this));
        }

        const exportSettingsButton = document.getElementById('exportSettingsButton');
        if (exportSettingsButton) {
            exportSettingsButton.addEventListener('click', this.exportSettings.bind(this));
        }
        
        // Listener für System-Theme-Änderungen im "auto"-Modus
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this.currentSettings.theme === 'auto') {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    },

    /**
     * Lädt Einstellungen aus dem localStorage.
     */
    loadSettings() {
        const savedSettings = Utils.getLocalStorage('gym-tracker-settings', {});
        this.currentSettings = { ...this.defaultSettings, ...savedSettings };
        this.applySettings();
    },

    /**
     * Speichert die aktuellen Einstellungen im localStorage.
     */
    saveSettings() {
        Utils.setLocalStorage('gym-tracker-settings', this.currentSettings);
    },

    /**
     * Wendet die aktuellen Einstellungen auf die Benutzeroberfläche an.
     */
    applySettings() {
        this.applyTheme(this.currentSettings.theme);
        this.updateSettingsForm();
        // Hier könnten weitere Funktionen zum Anwenden von Sprache, Einheiten etc. aufgerufen werden
    },

    /**
     * Aktualisiert das Einstellungsformular mit den aktuellen Werten.
     */
    updateSettingsForm() {
        const form = document.getElementById('settingsForm');
        if (form) {
            form.theme.value = this.currentSettings.theme;
            form.language.value = this.currentSettings.language;
            form.units.value = this.currentSettings.units;
            form.notifications.checked = this.currentSettings.notifications;
            form.autoSave.checked = this.currentSettings.autoSave;
            form.defaultRestTime.value = this.currentSettings.defaultRestTime;
        }
    },
    
    /**
     * Behandelt Änderungen im Einstellungsformular.
     * @param {Event} event - Das Change-Event.
     */
    handleFormChange(event) {
        const target = event.target;
        const key = target.name;
        let value;
        
        if (target.type === 'checkbox') {
            value = target.checked;
        } else if (target.type === 'number') {
            value = parseInt(target.value, 10);
        } else {
            value = target.value;
        }
        
        this.currentSettings[key] = value;
        this.saveSettings();
        this.applySettings();
    },
    
    /**
     * Ändert das Farbschema der Anwendung.
     * @param {string} theme - 'light', 'dark' oder 'auto'.
     */
    applyTheme(theme) {
        const html = document.documentElement;
        html.classList.remove('light', 'dark');
        
        if (theme === 'auto') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                html.classList.add('dark');
            } else {
                html.classList.add('light');
            }
        } else {
            html.classList.add(theme);
        }
    },

    /**
     * Setzt alle Einstellungen auf die Standardwerte zurück.
     */
    resetToDefaults() {
        Modals.showConfirmationModal('Möchtest du wirklich alle Einstellungen auf die Standardwerte zurücksetzen?', () => {
            this.currentSettings = { ...this.defaultSettings };
            this.applySettings();
            this.saveSettings();
            Utils.showAlert('Einstellungen zurückgesetzt', 'info');
        });
    },

    /**
     * Exportiert die aktuellen Einstellungen als JSON-Datei.
     */
    exportSettings() {
        const filename = `gym-tracker-settings-${Utils.getCurrentDate()}.json`;
        Utils.downloadJSON(this.currentSettings, filename);
        Utils.showAlert('Einstellungen exportiert', 'success');
    },

    /**
     * Prüft, ob der Dark-Mode aktiviert ist.
     * @returns {boolean} - True, wenn Dark-Mode aktiv ist.
     */
    isDarkMode() {
        return document.documentElement.classList.contains('dark');
    }
};
