// Hauptanwendungsmodul für Gym Tracker

const App = {
    // Anwendungszustand
    currentSection: 'dashboard',
    dashboardData: null,

    /**
     * Initialisiert die Anwendung
     */
    init() {
        console.log('App: Initialisiere Gym Tracker...');
        
        // Alle Module initialisieren
        Auth.init();
        if (typeof Workouts !== 'undefined') Workouts.init();
        if (typeof Exercises !== 'undefined') Exercises.init();
        if (typeof Admin !== 'undefined') Admin.init();
        if (typeof Profile !== 'undefined') Profile.init();
        if (typeof Modals !== 'undefined') Modals.init();

        // Heutiges Datum als Standard für neue Trainings setzen
        const workoutDateInput = document.getElementById('workoutDate');
        if (workoutDateInput) {
            workoutDateInput.value = Utils.getCurrentDate();
        }
        
        // URL-Behandlung und Navigation einrichten
        this.setupNavigation();
        
        console.log('App: Gym Tracker erfolgreich initialisiert');
    },

    /**
     * Richtet Navigation und URL-Behandlung ein
     */
    setupNavigation() {
        // Browser-Zurück/Vorwärts-Buttons behandeln
        window.addEventListener('popstate', (event) => {
            this.handleUrlChange();
        });
        
        // Initial-URL bei Seitenload behandeln
        this.handleUrlChange();
        
        // Dropdown-Funktionalität einrichten
        this.setupDropdowns();
    },

    /**
     * Richtet Dropdown-Menü-Funktionalität ein
     */
    setupDropdowns() {
        document.addEventListener('click', (e) => {
            // Dropdown öffnen/schließen bei Klick auf Toggle-Button
            if (e.target.closest('.dropdown-toggle')) {
                e.preventDefault();
                
                // Alle anderen Dropdowns schließen
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    if (!menu.closest('.nav-dropdown').contains(e.target)) {
                        menu.classList.remove('show');
                    }
                });
                
                // Aktuelles Dropdown umschalten
                const dropdown = e.target.closest('.nav-dropdown');
                const menu = dropdown.querySelector('.dropdown-menu');
                menu.classList.toggle('show');
                
                console.log('App: Dropdown umgeschaltet');
            } else {
                // Alle Dropdowns schließen bei Klick außerhalb
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });
    },

    /**
     * Behandelt URL-Änderungen (Browser-Navigation)
     */
    handleUrlChange() {
        const hash = window.location.hash.slice(1); // # entfernen
        const sectionFromUrl = hash || 'dashboard';
        
        // Nur Sektion wechseln wenn Benutzer authentifiziert ist
        if (Auth.isAuthenticated()) {
            if (this.isValidSection(sectionFromUrl)) {
                this.showSection(sectionFromUrl, false); // false = URL nicht aktualisieren
            } else {
                // Ungültige Sektion, zu Dashboard weiterleiten
                this.showSection('dashboard');
            }
        }
    },

    /**
     * Prüft ob Sektionsname gültig ist
     * @param {string} sectionName - Name der Sektion
     * @returns {boolean} - Gültig oder nicht
     */
    isValidSection(sectionName) {
        const validSections = ['dashboard', 'workouts', 'exercises', 'newWorkout', 'admin'];
        return validSections.includes(sectionName);
    },

    /**
     * Zeigt eine bestimmte Sektion mit URL-Verwaltung
     * @param {string} sectionName - Name der anzuzeigenden Sektion
     * @param {boolean} updateUrl - Ob URL aktualisiert werden soll
     */
    showSection(sectionName, updateUrl = true) {
        console.log('App: Wechsle zu Sektion:', sectionName);
        
        // URL aktualisieren wenn angefordert
        if (updateUrl) {
            const newUrl = window.location.pathname + '#' + sectionName;
            history.pushState({ section: sectionName }, '', newUrl);
        }
        
        // Alle Sektionen verstecken
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // Navigations-Button-Zustände aktualisieren
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Angeforderte Sektion anzeigen
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            this.currentSection = sectionName;
            
            // Sektions-spezifische Daten laden
            this.loadSectionData(sectionName);
        } else {
            console.error(`App: Sektion '${sectionName}' nicht gefunden`);
        }
    },

    /**
     * Lädt Daten für eine bestimmte Sektion
     * @param {string} sectionName - Name der Sektion
     */
    loadSectionData(sectionName) {
        switch(sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'workouts':
                if (typeof Workouts !== 'undefined') Workouts.loadAll();
                break;
            case 'exercises':
                if (typeof Exercises !== 'undefined') Exercises.loadList();
                break;
            case 'newWorkout':
                // Formular zurücksetzen wenn nicht im Bearbeitungsmodus
                if (typeof Workouts !== 'undefined' && !Workouts.isEditing) {
                    Workouts.resetForm();
                }
                // Übungen für Auswahl laden
                if (typeof Exercises !== 'undefined') Exercises.loadAll();
                break;
            case 'admin':
                if (Auth.isAdmin()) {
                    if (typeof Admin !== 'undefined') Admin.loadDashboard();
                } else {
                    Utils.showAlert('Keine Berechtigung für Admin-Bereich', 'error');
                    this.showSection('dashboard');
                }
                break;
            default:
                console.log(`App: Kein spezifischer Loader für Sektion: ${sectionName}`);
        }
    },

    /**
     * Lädt Dashboard-Daten
     */
    async loadDashboard() {
        try {
            const stats = await Utils.apiCall('/dashboard/stats');
            
            if (stats) {
                this.dashboardData = stats;
                this.displayDashboardStats(stats);
                this.displayRecentWorkouts(stats.recentWorkouts || []);
            }
        } catch (error) {
            console.error('App: Dashboard-Ladefehler:', error);
            Utils.showAlert('Fehler beim Laden der Dashboard-Daten: ' + error.message, 'error');
        }
    },

    /**
     * Zeigt Dashboard-Statistiken an
     * @param {object} stats - Statistik-Daten
     */
    displayDashboardStats(stats) {
        const elements = {
            totalWorkouts: document.getElementById('totalWorkouts'),
            thisWeekWorkouts: document.getElementById('thisWeekWorkouts'),
            totalTime: document.getElementById('totalTime')
        };

        // Statistiken in entsprechende Elemente einfügen
        if (elements.totalWorkouts) {
            elements.totalWorkouts.textContent = stats.totalWorkouts || 0;
        }
        
        if (elements.thisWeekWorkouts) {
            elements.thisWeekWorkouts.textContent = stats.thisWeekWorkouts || 0;
        }
        
        if (elements.totalTime) {
            elements.totalTime.textContent = stats.totalTime || 0;
        }
    },

    /**
     * Zeigt letzte Trainings im Dashboard an
     * @param {Array} workouts - Array der letzten Trainings
     */
    displayRecentWorkouts(workouts) {
        const container = document.getElementById('recentWorkouts');
        if (!container) return;
        
        if (workouts.length === 0) {
            // Leerzustand anzeigen
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Noch keine Trainings vorhanden</h3>
                    <p>Erstellen Sie Ihr erstes Training, um loszulegen!</p>
                    <button class="btn btn-success" onclick="App.showSection('newWorkout')">
                        Erstes Training erstellen
                    </button>
                </div>
            `;
            return;
        }

        // Trainings-Liste generieren
        container.innerHTML = workouts.map(workout => `
            <div class="workout-item" onclick="Workouts.showDetail(${workout.id})">
                <div class="workout-date">${Utils.formatDate(workout.date)}</div>
                <div class="workout-name">${Utils.sanitizeInput(workout.name)}</div>
                ${workout.notes ? `
                    <div style="color: var(--text-secondary); font-size: 14px; margin-top: 5px;">
                        ${Utils.sanitizeInput(workout.notes)}
                    </div>
                ` : ''}
            </div>
        `).join('');
    },

    /**
     * Aktualisiert die aktuelle Sektion
     */
    refresh() {
        this.loadSectionData(this.currentSection);
    },

    /**
     * Löscht zwischengespeicherte Daten
     */
    clearCache() {
        this.dashboardData = null;
        if (typeof Workouts !== 'undefined') Workouts.clearCache();
        if (typeof Exercises !== 'undefined') Exercises.clearCache();
        if (typeof Admin !== 'undefined') Admin.clearCache();
    },

    /**
     * Gibt Dashboard-Daten zurück
     * @returns {object|null} - Dashboard-Daten oder null
     */
    getDashboardData() {
        return this.dashboardData;
    },

    /**
     * Zeigt Ladezustand in einem Container an
     * @param {string} containerId - ID des Containers
     */
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading"></div>
                    <p>Lädt...</p>
                </div>
            `;
        }
    },

    /**
     * Zeigt Leerzustand mit optionalem Aktions-Button an
     * @param {string} containerId - ID des Containers
     * @param {string} message - Nachricht
     * @param {object|null} actionButton - Button-Konfiguration {text, action}
     */
    showEmptyState(containerId, message, actionButton = null) {
        const container = document.getElementById(containerId);
        if (container) {
            let html = `
                <div class="empty-state">
                    <h3>${message}</h3>
            `;
            
            if (actionButton) {
                html += `
                    <button class="btn btn-success" onclick="${actionButton.action}">
                        ${actionButton.text}
                    </button>
                `;
            }
            
            html += '</div>';
            container.innerHTML = html;
        }
    },

    /**
     * Exportiert Benutzerdaten
     */
    async exportData() {
        try {
            Utils.showAlert('Exportiere Daten...', 'info');
            
            // Alle relevanten Daten parallel laden
            const [workouts, exercises, profile] = await Promise.all([
                Utils.apiCall('/workouts'),
                Utils.apiCall('/exercises'),
                Utils.apiCall('/user/profile')
            ]);
            
            // Export-Objekt zusammenstellen
            const exportData = {
                export_date: new Date().toISOString(),
                user: {
                    username: profile.username,
                    email: profile.email,
                    first_name: profile.first_name,
                    last_name: profile.last_name,
                    created_at: profile.created_at
                },
                workouts: workouts || [],
                exercises: exercises || [],
                version: '2.0'
            };
            
            // Datei-Download
            const filename = `gym-tracker-export-${profile.username}-${new Date().toISOString().split('T')[0]}.json`;
            Utils.downloadJSON(exportData, filename);
            
            Utils.showAlert('Daten erfolgreich exportiert!', 'success');
        } catch (error) {
            console.error('App: Export-Fehler:', error);
            Utils.showAlert('Fehler beim Exportieren der Daten: ' + error.message, 'error');
        }
    },

    /**
     * Navigiert programmatisch zu einer Sektion
     * @param {string} sectionName - Name der Ziel-Sektion
     */
    navigateTo(sectionName) {
        if (this.isValidSection(sectionName)) {
            this.showSection(sectionName);
        } else {
            console.error('App: Ungültige Sektion:', sectionName);
            this.showSection('dashboard');
        }
    },

    /**
     * Gibt Anwendungsstatistiken zurück
     * @returns {object} - Statistik-Objekt
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
     * Setzt Anwendungszustand zurück
     */
    resetState() {
        this.currentSection = 'dashboard';
        this.dashboardData = null;
        this.clearCache();
        
        // URL zurücksetzen
        history.pushState(null, '', window.location.pathname);
        
        console.log('App: Anwendungszustand zurückgesetzt');
    }
};

// Anwendung bei DOM-Load initialisieren
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});

// Seiten-Entladung behandeln
window.addEventListener('beforeunload', function(e) {
    console.log('App: Seite wird entladen...');
});

// Online/Offline-Status behandeln
window.addEventListener('online', function() {
    Utils.showAlert('Internetverbindung wiederhergestellt', 'success');
});

window.addEventListener('offline', function() {
    Utils.showAlert('Internetverbindung verloren', 'warning');
});