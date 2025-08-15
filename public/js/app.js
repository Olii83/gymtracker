// Hauptanwendungsmodul für Gym Tracker - Überarbeitete Version
// Dieses Modul steuert den globalen Anwendungsfluss, die Navigation und den Zustand.

const App = {
    // Anwendungszustand
    currentSection: 'dashboard', // Die aktuell angezeigte Sektion
    dashboardData: null,         // Gecachte Daten für das Dashboard
    
    // Eine Liste aller verfügbaren Sektionen, um die Navigation zu validieren
    validSections: new Set(['dashboard', 'workouts', 'newWorkout', 'exercises', 'templates', 'stats', 'admin', 'profile', 'settings']),

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
        this.setupDashboardClicks();
        
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
    * Macht Dashboard-Karten klickbar und navigiert zu passenden Sektionen.
    */
    setupDashboardClicks() {
    // Cursor-Hinweis setzen
    document.querySelectorAll('#dashboard .stat-card').forEach(card => {
    card.style.cursor = 'pointer';
    });
    // Delegierter Click-Handler
    Utils.delegate(document, 'click', '#dashboard .stat-card', (event) => {
    const card = event.target.closest('.stat-card');
    if (!card) return;
    const cards = Array.from(document.querySelectorAll('#dashboard .stat-card'));
    const idx = cards.indexOf(card);
    let target = 'workouts';
    if (idx === 2) target = 'stats';
    else if (idx === 3) target = 'exercises';
    App.showSection(target);
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
        document.querySelectorAll('.content-section').forEach(section => {
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
            case 'stats':
                this.loadStats();
                break;
            default:
                // Dashboard: PR-Karte
                this.renderPRCard();
                break;
        }
    },

    /**
     * Läd und rendert die Statistik-Ansicht.
     */
    async loadStats() {
        const container = document.getElementById('statsContent');
        if (!container) return;
        container.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const stats = await Utils.apiCall('/dashboard/stats');
            const recent = (stats.recentWorkouts || []).map(w => `
                <div class="workout-item">
                    <div class="workout-date">${Utils.formatDate(w.date)}</div>
                    <div class="workout-name">${w.name || 'Ohne Namen'}</div>
                    <div class="workout-duration">${w.duration_minutes ? `${w.duration_minutes} Min.` : ''}</div>
                </div>
            `).join('');
            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card"><div><h4>Trainings gesamt</h4><p>${stats.totalWorkouts || 0}</p></div></div>
                    <div class="stat-card"><div><h4>Diese Woche</h4><p>${stats.thisWeekWorkouts || 0}</p></div></div>
                    <div class="stat-card"><div><h4>Minuten gesamt</h4><p>${stats.totalTime || 0}</p></div></div>
                </div>
                <div class="card">
                    <div class="card-title">Letzte Trainings</div>
                    <div class="workouts-list">${recent || '<p class="text-center">Keine Trainings vorhanden.</p>'}</div>
                </div>
            `;
        } catch (err) {
            container.innerHTML = `<div class="alert alert-error">Fehler beim Laden: ${err.message}</div>`;
        }
    },

    async renderPRCard() {
        const container = document.getElementById('dashboardPR');
        if (!container) return;
        container.innerHTML = '';
        try {
            const prs = await Utils.apiCall('/user/prs');
            if (!prs || prs.length === 0) {
                container.innerHTML = '';
                return;
            }
            const top = prs[0];
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-title">Persönliche Rekorde</div>
                <div>
                    <p><strong>Top-PR:</strong> ${top.exercise_name} — ${top.value} ${top.unit || 'kg'} (${Utils.formatDate(top.date_achieved)})</p>
                    <button id="showAllPRsBtn" class="btn btn-primary btn-sm">Alle PRs anzeigen</button>
                </div>
            `;
            container.appendChild(card);
            if (!document.getElementById('prsModal')) {
                const modalHTML = `
                    <div id="prsModal" class="modal">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h3 class="modal-title">Persönliche Rekorde</h3>
                                <button class="close" onclick="Modals.closeModal('prsModal')">&times;</button>
                            </div>
                            <div class="modal-body" id="prsModalBody"></div>
                        </div>
                    </div>`;
                document.body.insertAdjacentHTML('beforeend', modalHTML);
            }
            const btn = card.querySelector('#showAllPRsBtn');
            btn.addEventListener('click', async () => {
                try {
                    const list = await Utils.apiCall('/user/prs');
                    const body = document.getElementById('prsModalBody');
                    if (body) {
                        body.innerHTML = list.map(r => `
                            <div class="sets-input" style="justify-content:space-between;">
                                <div><strong>${r.exercise_name}</strong></div>
                                <div>${r.value} ${r.unit || 'kg'} — ${Utils.formatDate(r.date_achieved)}</div>
                            </div>
                        `).join('');
                    }
                    Modals.showModal('prsModal');
                } catch (e) {
                    Utils.showAlert('Fehler beim Laden der PRs: ' + e.message, 'error');
                }
            });
        } catch (err) {
            container.innerHTML = '';
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
