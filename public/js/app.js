// Hauptanwendungsmodul für Gym Tracker - Überarbeitete Version
// Dieses Modul steuert den globalen Anwendungsfluss, die Navigation und den Zustand.

const App = {
    // Anwendungszustand
    currentSection: 'dashboard', // Die aktuell angezeigte Sektion
    dashboardData: null,         // Gecachte Daten für das Dashboard
    
    // Eine Liste aller verfügbaren Sektionen, um die Navigation zu validieren
    validSections: new Set(['dashboard', 'workouts', 'newWorkout', 'exercises', 'admin', 'profile', 'settings']),

    /**
     * Initialisiert die Anwendung und alle Untermodule.
     */
    init() {
        console.log('App: Initialisiere Gym Tracker...');
        
        // Initialisiere alle Module. Verwende typeof, um Fehler zu vermeiden, falls ein Modul fehlt.
        Auth.init();
        if (typeof Workouts !== 'undefined') Workouts.init();
        if (typeof Exercises !== 'undefined') Exercises.init();
        if (typeof Admin !== 'undefined') Admin.init();
        if (typeof Profile !== 'undefined') Profile.init();
        if (typeof Modals !== 'undefined') Modals.init();
        if (typeof Settings !== 'undefined') Settings.init();
        if (typeof Templates !== 'undefined') Templates.init();

        // Heutiges Datum als Standard für neue Trainings setzen
        const workoutDateInput = document.getElementById('workoutDate');
        if (workoutDateInput) {
            workoutDateInput.value = Utils.getCurrentDate();
        }
        
        // Richte Navigation und URL-Behandlung ein
        this.setupNavigation();
        
        console.log('App: Gym Tracker erfolgreich initialisiert');
    },

    /**
     * Richtet die Navigation und URL-Behandlung ein.
     */
    setupNavigation() {
        // Event-Listener für die Browser-Zurück/Vorwärts-Buttons
        window.addEventListener('popstate', (event) => {
            this.handleUrlChange();
        });
        
        // Behandle die initiale URL beim Laden der Seite
        this.handleUrlChange();
        
        // Richte Dropdown-Funktionalität ein (aus Utils ausgelagert)
        this.setupDropdowns();
    },
    
    /**
     * Richte die Dropdown-Funktionalität für die Hauptnavigation ein.
     */
    setupDropdowns() {
        Utils.delegate(document, 'click', '.dropdown-toggle', (event) => {
            const dropdown = event.target.closest('.dropdown');
            if (dropdown) {
                dropdown.classList.toggle('active');
            }
        });
        
        // Schließe Dropdowns bei Klick außerhalb
        window.addEventListener('click', (event) => {
            if (!event.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown.active').forEach(dropdown => {
                    dropdown.classList.remove('active');
                });
            }
        });
    },

    /**
     * Behandelt URL-Änderungen und navigiert zur entsprechenden Sektion.
     */
    handleUrlChange() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            this.showSection(hash);
        } else {
            this.showSection('dashboard');
        }
    },
    
    /**
     * Navigiert zur gewünschten Sektion und aktualisiert die URL.
     * @param {string} sectionName - Der Name der Sektion, zu der navigiert werden soll.
     */
    showSection(sectionName) {
        if (!this.isValidSection(sectionName)) {
            console.error('App: Ungültige Sektion:', sectionName);
            sectionName = 'dashboard';
        }
        
        // Verstecke alle Sektionen
        document.querySelectorAll('.app-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // Zeige die ausgewählte Sektion
        const section = document.getElementById(sectionName);
        if (section) {
            section.classList.remove('hidden');
            this.currentSection = sectionName;
            
            // Setze die URL, ohne die Seite neu zu laden
            history.pushState(null, '', `#${sectionName}`);
            
            // Lade Daten für die spezifischen Sektionen bei Bedarf
            this.loadSectionData(sectionName);
        }
    },
    
    /**
     * Läd Daten, die für die aktuelle Sektion benötigt werden.
     * @param {string} sectionName - Der Name der aktuellen Sektion.
     */
    loadSectionData(sectionName) {
        switch (sectionName) {
            case 'workouts':
                Workouts.loadAll();
                break;
            case 'exercises':
                Exercises.loadAll();
                break;
            case 'admin':
                Admin.loadDashboard();
                break;
            case 'profile':
                Profile.loadProfile();
                break;
            case 'templates':
                Templates.loadAll();
                break;
            default:
                // Lade nichts oder Dashboard-Daten
                break;
        }
    },

    /**
     * Überprüft, ob der Sektionsname gültig ist.
     * @param {string} sectionName - Der zu prüfende Sektionsname.
     * @returns {boolean} - True, wenn der Name gültig ist.
     */
    isValidSection(sectionName) {
        return this.validSections.has(sectionName);
    },

    /**
     * Zeigt einen Lade-Indikator an.
     * @param {string} containerId - Die ID des Containers, in dem der Lade-Indikator angezeigt werden soll.
     */
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="loading-spinner"></div>';
        }
    },
    
    /**
     * Entfernt einen Lade-Indikator.
     * @param {string} containerId - Die ID des Containers.
     */
    hideLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const spinner = container.querySelector('.loading-spinner');
            if (spinner) {
                spinner.remove();
            }
        }
    },

    /**
     * Gibt Anwendungsstatistiken zurück.
     * @returns {object} - Statistik-Objekt.
     */
    getAppStats() {
        return {
            currentSection: this.currentSection,
            isAuthenticated: Auth.isAuthenticated(),
            isAdmin: Auth.isAdmin(),
            user: Auth.getCurrentUser(),
            dashboardLoaded: !!this.dashboardData
        };
    },

    /**
     * Setzt den gesamten Anwendungszustand zurück, z.B. beim Logout.
     */
    resetState() {
        this.currentSection = 'dashboard';
        this.dashboardData = null;
        // Lösche den Cache aller Module
        if (Workouts.clearCache) Workouts.clearCache();
        if (Exercises.clearCache) Exercises.clearCache();
        if (Templates.clearCache) Templates.clearCache();
        
        history.pushState(null, '', window.location.pathname);
        console.log('App: Anwendungszustand zurückgesetzt');
    }
};

// Startpunkt der Anwendung nach dem Laden des DOM
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
