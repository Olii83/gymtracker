// Modals-Modul für Gym Tracker - Zentrale Modal-Verwaltung

const Modals = {
    // Zustandsvariablen für Modal-Verwaltung
    activeModals: new Set(), // Set aktiver Modals
    modalStack: [], // Stack für Modal-Reihenfolge
    baseZIndex: 1050, // Basis Z-Index für Modals
    
    /**
     * Initialisiert das Modal-System
     * Richtet globale Event-Listener und Standard-Modals ein
     */
    init() {
        console.log('Modals: Initialisiere Modal-System...');
        this.setupGlobalListeners();
        this.createAdminModals();
        this.createExerciseModals();
        this.createWorkoutModals();
        this.createProfileModals();
        this.createConfirmationModal();
        console.log('Modals: System erfolgreich initialisiert');
    },

    /**
     * Richtet globale Modal-Event-Listener ein
     * Behandelt Escape-Taste und Klicks außerhalb von Modals
     */
    setupGlobalListeners() {
        // Modals schließen bei Klick außerhalb des Modal-Inhalts
        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                this.closeModal(event.target.id);
            }
        });

        // Modals mit Escape-Taste schließen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalStack.length > 0) {
                const topModal = this.modalStack[this.modalStack.length - 1];
                this.closeModal(topModal);
            }
        });

        // Fokus-Management für Barrierefreiheit
        document.addEventListener('focusin', this.handleFocusManagement.bind(this));
        
        console.log('Modals: Globale Event-Listener eingerichtet');
    },

    /**
     * Behandelt Fokus-Management für Barrierefreiheit
     * Hält Fokus innerhalb aktiver Modals
     * @param {Event} event Focus-Event
     */
    handleFocusManagement(event) {
        if (this.modalStack.length === 0) return;
        
        const topModalId = this.modalStack[this.modalStack.length - 1];
        const topModal = document.getElementById(topModalId);
        
        if (topModal && !topModal.contains(event.target)) {
            // Fokus zurück ins Modal leiten
            const focusableElements = topModal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        }
    },

    /**
     * Erstellt Admin-bezogene Modals
     * Generiert Modals für Benutzerverwaltung und Admin-Funktionen
     */
    createAdminModals() {
        const adminModalsHTML = `
            <!-- Modal: Passwort zurücksetzen (Admin) -->
            <div id="passwordResetModal" class="modal" role="dialog" aria-labelledby="passwordResetTitle" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="passwordResetTitle" class="modal-title">🔑 Passwort zurücksetzen</h2>
                        <button class="close" onclick="Modals.closeModal('passwordResetModal')" aria-label="Modal schließen">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <strong>Info:</strong> Das neue Passwort wird sofort aktiviert.
                        </div>
                        
                        <p>Passwort zurücksetzen für Benutzer: <strong id="resetUsername"></strong></p>
                        
                        <form id="adminPasswordResetForm">
                            <input type="hidden" id="resetUserId">
                            
                            <div class="form-group">
                                <label for="adminNewPassword">Neues Passwort *</label>
                                <input type="password" id="adminNewPassword" name="newPassword" 
                                       required minlength="6" maxlength="128"
                                       placeholder="Mindestens 6 Zeichen">
                                <small>Mindestens 6 Zeichen empfohlen</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="adminConfirmPassword">Passwort bestätigen *</label>
                                <input type="password" id="adminConfirmPassword" name="confirmPassword" 
                                       required minlength="6" maxlength="128"
                                       placeholder="Passwort wiederholen">
                            </div>
                            
                            <div id="passwordResetAlert"></div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-warning">
                                    🔑 Passwort zurücksetzen
                                </button>
                                <button type="button" class="btn btn-outline" onclick="Modals.closeModal('passwordResetModal')">
                                    Abbrechen
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Modal: Benutzer löschen (Admin) -->
            <div id="deleteUserModal" class="modal" role="dialog" aria-labelledby="deleteUserTitle" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="deleteUserTitle" class="modal-title">🗑️ Benutzer löschen</h2>
                        <button class="close" onclick="Modals.closeModal('deleteUserModal')" aria-label="Modal schließen">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-danger">
                            <strong>⚠️ Warnung:</strong> Diese Aktion kann nicht rückgängig gemacht werden!
                        </div>
                        
                        <p><strong>Benutzer löschen:</strong> <span id="deleteUsername" style="color: var(--accent-danger);"></span></p>
                        <p>Alle Daten dieses Benutzers (Trainings, Übungen, Einstellungen, etc.) werden permanent gelöscht.</p>
                        
                        <div class="alert alert-warning">
                            <strong>Was wird gelöscht:</strong>
                            <ul style="margin: 10px 0 0 20px;">
                                <li>Alle Trainings und Übungsverläufe</li>
                                <li>Persönliche Übungen</li>
                                <li>Workout-Vorlagen</li>
                                <li>Benutzereinstellungen</li>
                                <li>Körpermessungen und Fortschrittsdaten</li>
                            </ul>
                        </div>
                        
                        <form id="deleteUserForm">
                            <input type="hidden" id="deleteUserId">
                            
                            <div class="form-group">
                                <label for="deleteConfirmation">
                                    Geben Sie "LÖSCHEN" ein, um zu bestätigen:
                                </label>
                                <input type="text" id="deleteConfirmation" name="confirmation" 
                                       required placeholder="LÖSCHEN" 
                                       style="font-family: monospace; text-transform: uppercase;">
                                <small>Groß-/Kleinschreibung wird beachtet</small>
                            </div>
                            
                            <div id="deleteUserAlert"></div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-danger">
                                    🗑️ Benutzer endgültig löschen
                                </button>
                                <button type="button" class="btn btn-outline" onclick="Modals.closeModal('deleteUserModal')">
                                    Abbrechen
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Modal: Admin-Statistiken -->
            <div id="adminStatsModal" class="modal" role="dialog" aria-labelledby="adminStatsTitle" aria-hidden="true">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h2 id="adminStatsTitle" class="modal-title">📊 Erweiterte Statistiken</h2>
                        <button class="close" onclick="Modals.closeModal('adminStatsModal')" aria-label="Modal schließen">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="adminStatsContent">
                            <div class="loading-state">
                                <div class="loading"></div>
                                <p>Lade Statistiken...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addToContainer(adminModalsHTML);
        console.log('Modals: Admin-Modals erstellt');
    },

    /**
     * Erstellt Übungs-bezogene Modals
     * Generiert Modals für Übungsverwaltung
     */
    createExerciseModals() {
        // Übungsmodal wird bereits in exercises.js erstellt
        // Hier können zusätzliche Übungs-Modals hinzugefügt werden
        
        const exerciseModalsHTML = `
            <!-- Modal: Übungsdetails anzeigen -->
            <div id="exerciseDetailModal" class="modal" role="dialog" aria-labelledby="exerciseDetailTitle" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="exerciseDetailTitle" class="modal-title">💪 Übungsdetails</h2>
                        <button class="close" onclick="Modals.closeModal('exerciseDetailModal')" aria-label="Modal schließen">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="exerciseDetailContent">
                            <!-- Übungsdetails werden hier geladen -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Übung importieren -->
            <div id="importExercisesModal" class="modal" role="dialog" aria-labelledby="importExercisesTitle" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="importExercisesTitle" class="modal-title">📥 Übungen importieren</h2>
                        <button class="close" onclick="Modals.closeModal('importExercisesModal')" aria-label="Modal schließen">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <strong>Info:</strong> Sie können Übungen im JSON-Format importieren.
                        </div>
                        
                        <form id="importExercisesForm">
                            <div class="form-group">
                                <label for="exerciseFileInput">JSON-Datei auswählen</label>
                                <input type="file" id="exerciseFileInput" accept=".json" required>
                                <small>Nur .json Dateien werden unterstützt</small>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="overwriteExisting" value="1">
                                    Vorhandene Übungen überschreiben
                                </label>
                                <small>Bei Aktivierung werden Übungen mit gleichem Namen ersetzt</small>
                            </div>
                            
                            <div id="importExercisesAlert"></div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-success">
                                    📥 Importieren
                                </button>
                                <button type="button" class="btn btn-outline" onclick="Modals.closeModal('importExercisesModal')">
                                    Abbrechen
                                </button>
                            </div>
                        </form>
                        
                        <div id="importProgress" class="hidden">
                            <div style="margin: 20px 0;">
                                <div class="loading"></div>
                                <p>Importiere Übungen...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addToContainer(exerciseModalsHTML);
        console.log('Modals: Übungs-Modals erstellt');
    },

    /**
     * Erstellt Training-bezogene Modals
     * Generiert Modals für Workout-Verwaltung
     */
    createWorkoutModals() {
        const workoutModalsHTML = `
            <!-- Modal: Training Details -->
            <div id="workoutDetailModal" class="modal" role="dialog" aria-labelledby="workoutDetailTitle" aria-hidden="true">
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h2 id="workoutDetailTitle" class="modal-title">🏋️ Training Details</h2>
                        <button class="close" onclick="Modals.closeModal('workoutDetailModal')" aria-label="Modal schließen">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="workoutDetailContent">
                            <!-- Training-Details werden hier geladen -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Training löschen Bestätigung -->
            <div id="deleteWorkoutModal" class="modal" role="dialog" aria-labelledby="deleteWorkoutTitle" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="deleteWorkoutTitle" class="modal-title">🗑️ Training löschen</h2>
                        <button class="close" onclick="Modals.closeModal('deleteWorkoutModal')" aria-label="Modal schließen">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <strong>⚠️ Achtung:</strong> Dieser Vorgang kann nicht rückgängig gemacht werden!
                        </div>
                        
                        <p>Möchten Sie das Training "<strong id="deleteWorkoutName"></strong>" wirklich löschen?</p>
                        <p><small>Datum: <span id="deleteWorkoutDate"></span></small></p>
                        
                        <div id="deleteWorkoutAlert"></div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-danger" onclick="Workouts.confirmDelete()">
                                🗑️ Ja, löschen
                            </button>
                            <button type="button" class="btn btn-outline" onclick="Modals.closeModal('deleteWorkoutModal')">
                                Abbrechen
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Training-Vorlage speichern -->
            <div id="saveTemplateModal" class="modal" role="dialog" aria-labelledby="saveTemplateTitle" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="saveTemplateTitle" class="modal-title">💾 Als Vorlage speichern</h2>
                        <button class="close" onclick="Modals.closeModal('saveTemplateModal')" aria-label="Modal schließen">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Speichern Sie Ihr aktuelles Training als wiederverwendbare Vorlage.</p>
                        
                        <form id="saveTemplateForm">
                            <div class="form-group">
                                <label for="templateName">Name der Vorlage *</label>
                                <input type="text" id="templateName" name="templateName" required
                                       placeholder="z.B. Push-Tag, Oberkörper, Ganzkörper" maxlength="100">
                            </div>
                            
                            <div class="form-group">
                                <label for="templateCategory">Kategorie</label>
                                <select id="templateCategory" name="templateCategory">
                                    <option value="Krafttraining">Krafttraining</option>
                                    <option value="Cardio">Cardio</option>
                                    <option value="Ganzkörper">Ganzkörper</option>
                                    <option value="Push">Push (Druck)</option>
                                    <option value="Pull">Pull (Zug)</option>
                                    <option value="Beine">Beine</option>
                                    <option value="Oberkörper">Oberkörper</option>
                                    <option value="Stretching">Stretching</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="templateDescription">Beschreibung</label>
                                <textarea id="templateDescription" name="templateDescription" 
                                         placeholder="Optional: Beschreibung der Vorlage..." maxlength="500"></textarea>
                            </div>
                            
                            <div id="saveTemplateAlert"></div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-success">
                                    💾 Vorlage speichern
                                </button>
                                <button type="button" class="btn btn-outline" onclick="Modals.closeModal('saveTemplateModal')">
                                    Abbrechen
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.addToContainer(workoutModalsHTML);
        console.log('Modals: Workout-Modals erstellt');
    },

    /**
     * Erstellt Profil-bezogene Modals
     * Generiert Modals für Benutzerprofil-Verwaltung
     */
    createProfileModals() {
        // Profil-Modal wird bereits in profile.js erstellt
        // Hier können zusätzliche Profil-Modals hinzugefügt werden
        
        const profileModalsHTML = `
            <!-- Modal: Benutzer-Einstellungen -->
            <div id="userSettingsModal" class="modal" role="dialog" aria-labelledby="userSettingsTitle" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="userSettingsTitle" class="modal-title">⚙️ Benutzer-Einstellungen</h2>
                        <button class="close" onclick="Modals.closeModal('userSettingsModal')" aria-label="Modal schließen">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="userSettingsForm">
                            <h3>🎨 Erscheinungsbild</h3>
                            <div class="form-group">
                                <label for="themeSelect">Design</label>
                                <select id="themeSelect" name="theme">
                                    <option value="light">Hell</option>
                                    <option value="dark">Dunkel</option>
                                    <option value="auto">Automatisch</option>
                                </select>
                            </div>
                            
                            <h3>🏋️ Training</h3>
                            <div class="form-group">
                                <label for="defaultRestTime">Standard-Pausenzeit (Sekunden)</label>
                                <input type="number" id="defaultRestTime" name="defaultRestTime" 
                                       min="30" max="600" value="90">
                            </div>
                            
                            <div class="form-group">
                                <label for="unitSystem">Einheitensystem</label>
                                <select id="unitSystem" name="unitSystem">
                                    <option value="metric">Metrisch (kg, cm)</option>
                                    <option value="imperial">Imperial (lbs, in)</option>
                                </select>
                            </div>
                            
                            <h3>🔔 Benachrichtigungen</h3>
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="enableNotifications" name="enableNotifications">
                                    Benachrichtigungen aktivieren
                                </label>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="autoSave" name="autoSave">
                                    Automatisch speichern
                                </label>
                            </div>
                            
                            <div id="userSettingsAlert"></div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-success">
                                    💾 Einstellungen speichern
                                </button>
                                <button type="button" class="btn btn-outline" onclick="Settings.resetToDefaults()">
                                    🔄 Zurücksetzen
                                </button>
                                <button type="button" class="btn btn-outline" onclick="Modals.closeModal('userSettingsModal')">
                                    Abbrechen
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Modal: Daten exportieren -->
            <div id="exportDataModal" class="modal" role="dialog" aria-labelledby="exportDataTitle" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="exportDataTitle" class="modal-title">📤 Daten exportieren</h2>
                        <button class="close" onclick="Modals.closeModal('exportDataModal')" aria-label="Modal schließen">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Exportieren Sie Ihre Gym Tracker Daten für Backup oder Transfer.</p>
                        
                        <div class="form-group">
                            <h3>📋 Was möchten Sie exportieren?</h3>
                            <label>
                                <input type="checkbox" id="exportWorkouts" checked>
                                Trainings und Übungsverläufe
                            </label>
                            <label>
                                <input type="checkbox" id="exportExercises" checked>
                                Persönliche Übungen
                            </label>
                            <label>
                                <input type="checkbox" id="exportTemplates" checked>
                                Workout-Vorlagen
                            </label>
                            <label>
                                <input type="checkbox" id="exportProfile" checked>
                                Profildaten
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <h3>📅 Zeitraum</h3>
                            <label for="exportDateFrom">Von:</label>
                            <input type="date" id="exportDateFrom" name="exportDateFrom">
                            
                            <label for="exportDateTo">Bis:</label>
                            <input type="date" id="exportDateTo" name="exportDateTo">
                            <small>Leer lassen für alle Daten</small>
                        </div>
                        
                        <div id="exportDataAlert"></div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-success" onclick="this.performExport()">
                                📤 Export starten
                            </button>
                            <button type="button" class="btn btn-outline" onclick="Modals.closeModal('exportDataModal')">
                                Abbrechen
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addToContainer(profileModalsHTML);
        console.log('Modals: Profil-Modals erstellt');
    },

    /**
     * Erstellt allgemeines Bestätigungs-Modal
     * Universelles Modal für Ja/Nein-Abfragen
     */
    createConfirmationModal() {
        const confirmationModalHTML = `
            <!-- Universal-Bestätigungs-Modal -->
            <div id="confirmationModal" class="modal" role="dialog" aria-labelledby="confirmationTitle" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="confirmationTitle" class="modal-title">❓ Bestätigung</h2>
                        <button class="close" onclick="Modals.closeModal('confirmationModal')" aria-label="Modal schließen">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="confirmationIcon" style="text-align: center; font-size: 48px; margin-bottom: 20px;">
                            ❓
                        </div>
                        
                        <div id="confirmationMessage" style="text-align: center; margin-bottom: 30px;">
                            <!-- Nachricht wird hier eingefügt -->
                        </div>
                        
                        <div class="form-actions" style="justify-content: center;">
                            <button type="button" id="confirmationYes" class="btn btn-primary">
                                Ja
                            </button>
                            <button type="button" id="confirmationNo" class="btn btn-outline" onclick="Modals.closeModal('confirmationModal')">
                                Nein
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Erweiterte Bestätigung -->
            <div id="advancedConfirmationModal" class="modal" role="dialog" aria-labelledby="advancedConfirmationTitle" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="advancedConfirmationTitle" class="modal-title">⚠️ Bestätigung erforderlich</h2>
                        <button class="close" onclick="Modals.closeModal('advancedConfirmationModal')" aria-label="Modal schließen">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="advancedConfirmationContent">
                            <!-- Erweiterte Bestätigungsinhalte -->
                        </div>
                        
                        <div class="form-group">
                            <label for="confirmationInput">
                                Geben Sie "<span id="confirmationText"></span>" ein, um zu bestätigen:
                            </label>
                            <input type="text" id="confirmationInput" placeholder="Bestätigungstext eingeben">
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" id="advancedConfirmationSubmit" class="btn btn-danger" disabled>
                                Bestätigen
                            </button>
                            <button type="button" class="btn btn-outline" onclick="Modals.closeModal('advancedConfirmationModal')">
                                Abbrechen
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addToContainer(confirmationModalHTML);
        
        // Event-Listener für erweiterte Bestätigung
        const confirmationInput = document.getElementById('confirmationInput');
        const submitButton = document.getElementById('advancedConfirmationSubmit');
        
        if (confirmationInput && submitButton) {
            confirmationInput.addEventListener('input', () => {
                const requiredText = document.getElementById('confirmationText')?.textContent || '';
                const inputText = confirmationInput.value;
                submitButton.disabled = inputText !== requiredText;
            });
        }
        
        console.log('Modals: Bestätigungs-Modals erstellt');
    },

    /**
     * Fügt HTML zum Modals-Container hinzu
     * Stellt sicher, dass Container existiert und fügt HTML hinzu
     * @param {string} html HTML-String zum Hinzufügen
     */
    addToContainer(html) {
        let container = document.getElementById('modals-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modals-container';
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }
        container.innerHTML += html;
    },

    /**
     * Zeigt Modal mit erweiterten Optionen an
     * Öffnet Modal und verwaltet Zustand
     * @param {string} modalId ID des anzuzeigenden Modals
     * @param {Object} options Zusätzliche Optionen
     */
    showModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modals: Modal '${modalId}' nicht gefunden`);
            return false;
        }

        // Modal-Stack verwalten
        if (!this.modalStack.includes(modalId)) {
            this.modalStack.push(modalId);
        }
        
        this.activeModals.add(modalId);

        // Z-Index für Stapelung setzen
        const zIndex = this.baseZIndex + this.modalStack.length;
        modal.style.zIndex = zIndex;

        // Modal anzeigen
        modal.style.display = 'block';
        modal.setAttribute('aria-hidden', 'false');

        // Fokus setzen
        setTimeout(() => {
            const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 100);

        // Body-Scroll verhindern wenn erstes Modal
        if (this.modalStack.length === 1) {
            document.body.style.overflow = 'hidden';
        }

        // Callback ausführen wenn vorhanden
        if (options.onShow && typeof options.onShow === 'function') {
            options.onShow();
        }

        console.log(`Modals: Modal '${modalId}' geöffnet`);
        return true;
    },

    /**
     * Schließt spezifisches Modal
     * Versteckt Modal und bereinigt Zustand
     * @param {string} modalId ID des zu schließenden Modals
     * @param {Object} options Zusätzliche Optionen
     */
    closeModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modals: Modal '${modalId}' nicht gefunden`);
            return false;
        }

        // Modal verstecken
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');

        // Aus Stack und aktiven Modals entfernen
        this.modalStack = this.modalStack.filter(id => id !== modalId);
        this.activeModals.delete(modalId);

        // Body-Scroll wiederherstellen wenn keine Modals mehr aktiv
        if (this.modalStack.length === 0) {
            document.body.style.overflow = '';
        }

        // Fokus zurück zum letzten Modal oder Body
        if (this.modalStack.length > 0) {
            const lastModalId = this.modalStack[this.modalStack.length - 1];
            const lastModal = document.getElementById(lastModalId);
            if (lastModal) {
                const focusable = lastModal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusable) focusable.focus();
            }
        } else {
            // Fokus zu Body oder einem spezifischen Element zurücksetzen
            document.body.focus();
        }

        // Formular zurücksetzen falls vorhanden
        const form = modal.querySelector('form');
        if (form && !options.preserveForm) {
            form.reset();
            
            // Alert-Container leeren
            const alertContainers = modal.querySelectorAll('[id$="Alert"]');
            alertContainers.forEach(container => {
                container.innerHTML = '';
            });
        }

        // Callback ausführen wenn vorhanden
        if (options.onClose && typeof options.onClose === 'function') {
            options.onClose();
        }

        console.log(`Modals: Modal '${modalId}' geschlossen`);
        return true;
    },

    /**
     * Schließt alle aktiven Modals
     * Versteckt alle offenen Modals
     */
    closeAllModals() {
        const modalIds = [...this.activeModals];
        modalIds.forEach(modalId => {
            this.closeModal(modalId);
        });
        
        console.log('Modals: Alle Modals geschlossen');
    },

    /**
     * Prüft ob ein Modal geöffnet ist
     * @param {string} modalId ID des zu prüfenden Modals (optional)
     * @returns {boolean} True wenn Modal(s) offen
     */
    isModalOpen(modalId = null) {
        if (modalId) {
            return this.activeModals.has(modalId);
        }
        return this.activeModals.size > 0;
    },

    /**
     * Gibt aktuell geöffnetes Modal zurück
     * @returns {string|null} ID des obersten Modals oder null
     */
    getCurrentModal() {
        return this.modalStack.length > 0 ? this.modalStack[this.modalStack.length - 1] : null;
    },

    /**
     * Zeigt einfaches Bestätigungs-Modal
     * @param {string} message Bestätigungsnachricht
     * @param {Function} onConfirm Callback bei Bestätigung
     * @param {Object} options Zusätzliche Optionen
     */
    showConfirmation(message, onConfirm, options = {}) {
        const {
            title = 'Bestätigung',
            icon = '❓',
            confirmText = 'Ja',
            cancelText = 'Nein',
            confirmClass = 'btn-primary'
        } = options;

        // Modal-Inhalte setzen
        document.getElementById('confirmationTitle').textContent = title;
        document.getElementById('confirmationIcon').textContent = icon;
        document.getElementById('confirmationMessage').innerHTML = message;

        const yesButton = document.getElementById('confirmationYes');
        const noButton = document.getElementById('confirmationNo');

        yesButton.textContent = confirmText;
        yesButton.className = `btn ${confirmClass}`;
        noButton.textContent = cancelText;

        // Event-Listener für Bestätigung
        const handleConfirm = () => {
            this.closeModal('confirmationModal');
            if (onConfirm && typeof onConfirm === 'function') {
                onConfirm();
            }
            yesButton.removeEventListener('click', handleConfirm);
        };

        yesButton.addEventListener('click', handleConfirm);

        // Modal anzeigen
        this.showModal('confirmationModal');
    },

    /**
     * Zeigt erweiterte Bestätigung mit Texteingabe
     * @param {string} message Bestätigungsnachricht
     * @param {string} confirmationText Erforderlicher Bestätigungstext
     * @param {Function} onConfirm Callback bei Bestätigung
     * @param {Object} options Zusätzliche Optionen
     */
    showAdvancedConfirmation(message, confirmationText, onConfirm, options = {}) {
        const {
            title = 'Bestätigung erforderlich',
            dangerAction = true
        } = options;

        // Modal-Inhalte setzen
        document.getElementById('advancedConfirmationTitle').textContent = title;
        document.getElementById('advancedConfirmationContent').innerHTML = message;
        document.getElementById('confirmationText').textContent = confirmationText;

        const input = document.getElementById('confirmationInput');
        const submitButton = document.getElementById('advancedConfirmationSubmit');

        // Input und Button zurücksetzen
        input.value = '';
        submitButton.disabled = true;
        submitButton.className = dangerAction ? 'btn btn-danger' : 'btn btn-primary';

        // Event-Listener für Bestätigung
        const handleConfirm = () => {
            if (input.value === confirmationText) {
                this.closeModal('advancedConfirmationModal');
                if (onConfirm && typeof onConfirm === 'function') {
                    onConfirm();
                }
                submitButton.removeEventListener('click', handleConfirm);
            }
        };

        submitButton.addEventListener('click', handleConfirm);

        // Modal anzeigen
        this.showModal('advancedConfirmationModal');
    },

    /**
     * Zeigt Lade-Modal an
     * @param {string} message Lade-Nachricht
     * @param {string} modalId ID für das Lade-Modal
     */
    showLoading(message = 'Lädt...', modalId = 'loadingModal') {
        // Lade-Modal erstellen falls nicht vorhanden
        if (!document.getElementById(modalId)) {
            const loadingModalHTML = `
                <div id="${modalId}" class="modal" role="dialog" aria-hidden="true">
                    <div class="modal-content" style="max-width: 400px;">
                        <div class="modal-body" style="text-align: center; padding: 40px;">
                            <div class="loading-spinner" style="margin-bottom: 20px;"></div>
                            <p id="${modalId}Message">${message}</p>
                        </div>
                    </div>
                </div>
            `;
            this.addToContainer(loadingModalHTML);
        }

        // Nachricht aktualisieren
        const messageElement = document.getElementById(`${modalId}Message`);
        if (messageElement) {
            messageElement.textContent = message;
        }

        this.showModal(modalId);
    },

    /**
     * Versteckt Lade-Modal
     * @param {string} modalId ID des Lade-Modals
     */
    hideLoading(modalId = 'loadingModal') {
        this.closeModal(modalId);
    },

    /**
     * Setzt Modal-System zurück
     * Schließt alle Modals und bereinigt Zustand
     */
    reset() {
        this.closeAllModals();
        this.activeModals.clear();
        this.modalStack = [];
        document.body.style.overflow = '';
        console.log('Modals: System zurückgesetzt');
    },

    /**
     * Gibt Debug-Informationen zurück
     * @returns {Object} Debug-Informationen über Modal-Zustand
     */
    getDebugInfo() {
        return {
            activeModals: Array.from(this.activeModals),
            modalStack: [...this.modalStack],
            modalCount: this.activeModals.size,
            bodyOverflow: document.body.style.overflow,
            baseZIndex: this.baseZIndex
        };
    },

    /**
     * Validiert Modal-Zustand
     * Überprüft interne Konsistenz des Modal-Systems
     * @returns {Object} Validierungsergebnis
     */
    validateState() {
        const issues = [];
        
        // Prüfe Konsistenz zwischen activeModals und modalStack
        const stackSet = new Set(this.modalStack);
        const activeSet = this.activeModals;
        
        if (stackSet.size !== activeSet.size) {
            issues.push('Inkonsistenz zwischen Modal-Stack und aktiven Modals');
        }
        
        // Prüfe ob alle Stack-Modals auch aktiv sind
        for (const modalId of this.modalStack) {
            if (!activeSet.has(modalId)) {
                issues.push(`Modal '${modalId}' ist im Stack aber nicht aktiv`);
            }
        }
        
        // Prüfe ob alle aktiven Modals auch im Stack sind
        for (const modalId of activeSet) {
            if (!this.modalStack.includes(modalId)) {
                issues.push(`Modal '${modalId}' ist aktiv aber nicht im Stack`);
            }
        }
        
        // Prüfe Body-Overflow-Zustand
        if (this.activeModals.size > 0 && document.body.style.overflow !== 'hidden') {
            issues.push('Modals aktiv aber Body-Overflow nicht gesetzt');
        }
        
        if (this.activeModals.size === 0 && document.body.style.overflow === 'hidden') {
            issues.push('Keine Modals aktiv aber Body-Overflow gesetzt');
        }
        
        return {
            isValid: issues.length === 0,
            issues: issues,
            debugInfo: this.getDebugInfo()
        };
    },

    /**
     * Führt Wartung des Modal-Systems durch
     * Bereinigt inkonsistente Zustände
     */
    performMaintenance() {
        console.log('Modals: Führe Wartung durch...');
        
        const validation = this.validateState();
        
        if (!validation.isValid) {
            console.warn('Modals: Inkonsistenzen gefunden:', validation.issues);
            
            // Versuche automatische Reparatur
            this.repairState();
        }
        
        // Entferne verwaiste Event-Listener
        this.cleanupEventListeners();
        
        console.log('Modals: Wartung abgeschlossen');
        return validation;
    },

    /**
     * Repariert inkonsistenten Modal-Zustand
     * Versucht automatische Wiederherstellung
     */
    repairState() {
        console.log('Modals: Repariere Zustand...');
        
        // Alle DOM-Modals prüfen und Zustand entsprechend anpassen
        const allModals = document.querySelectorAll('.modal');
        const actuallyVisible = [];
        
        allModals.forEach(modal => {
            if (modal.style.display === 'block') {
                actuallyVisible.push(modal.id);
            } else {
                // Stelle sicher, dass versteckte Modals korrekt markiert sind
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            }
        });
        
        // Zustand basierend auf tatsächlich sichtbaren Modals wiederherstellen
        this.activeModals = new Set(actuallyVisible);
        this.modalStack = [...actuallyVisible];
        
        // Body-Overflow entsprechend setzen
        if (actuallyVisible.length > 0) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        
        console.log('Modals: Zustand repariert, aktive Modals:', actuallyVisible);
    },

    /**
     * Bereinigt verwaiste Event-Listener
     * Entfernt nicht mehr benötigte Event-Handler
     */
    cleanupEventListeners() {
        // Entferne doppelte Event-Listener von Bestätigungs-Buttons
        const confirmButtons = document.querySelectorAll('#confirmationYes, #advancedConfirmationSubmit');
        confirmButtons.forEach(button => {
            // Klone Button um alle Event-Listener zu entfernen
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
    },

    /**
     * Zeigt Modal mit Animation an
     * Erweiterte showModal-Version mit CSS-Animationen
     * @param {string} modalId ID des anzuzeigenden Modals
     * @param {Object} options Animations-Optionen
     */
    showModalAnimated(modalId, options = {}) {
        const {
            animation = 'fadeIn',
            duration = 300,
            onComplete = null
        } = options;
        
        const success = this.showModal(modalId, options);
        if (!success) return false;
        
        const modal = document.getElementById(modalId);
        const modalContent = modal.querySelector('.modal-content');
        
        if (modalContent) {
            // Animation anwenden
            modalContent.style.animation = `${animation} ${duration}ms ease-out`;
            
            // Animation-Event-Listener
            const handleAnimationEnd = () => {
                modalContent.style.animation = '';
                modalContent.removeEventListener('animationend', handleAnimationEnd);
                
                if (onComplete && typeof onComplete === 'function') {
                    onComplete();
                }
            };
            
            modalContent.addEventListener('animationend', handleAnimationEnd);
        }
        
        return true;
    },

    /**
     * Schließt Modal mit Animation
     * Erweiterte closeModal-Version mit CSS-Animationen
     * @param {string} modalId ID des zu schließenden Modals
     * @param {Object} options Animations-Optionen
     */
    closeModalAnimated(modalId, options = {}) {
        const {
            animation = 'fadeOut',
            duration = 200,
            onComplete = null
        } = options;
        
        const modal = document.getElementById(modalId);
        if (!modal || modal.style.display === 'none') {
            return false;
        }
        
        const modalContent = modal.querySelector('.modal-content');
        
        if (modalContent) {
            // Animation anwenden
            modalContent.style.animation = `${animation} ${duration}ms ease-in`;
            
            // Nach Animation schließen
            const handleAnimationEnd = () => {
                modalContent.style.animation = '';
                modalContent.removeEventListener('animationend', handleAnimationEnd);
                
                this.closeModal(modalId, options);
                
                if (onComplete && typeof onComplete === 'function') {
                    onComplete();
                }
            };
            
            modalContent.addEventListener('animationend', handleAnimationEnd);
        } else {
            // Fallback ohne Animation
            this.closeModal(modalId, options);
        }
        
        return true;
    },

    /**
     * Erstellt CSS-Animationen für Modals
     * Fügt Standard-Animationen zum Dokument hinzu
     */
    createModalAnimations() {
        const animationCSS = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-20px); }
            }
            
            @keyframes slideInDown {
                from { opacity: 0; transform: translateY(-100%); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes slideOutUp {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-100%); }
            }
            
            @keyframes scaleIn {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
            }
            
            @keyframes scaleOut {
                from { opacity: 1; transform: scale(1); }
                to { opacity: 0; transform: scale(0.8); }
            }
        `;
        
        // Prüfe ob Animationen bereits existieren
        if (!document.getElementById('modal-animations')) {
            const style = document.createElement('style');
            style.id = 'modal-animations';
            style.textContent = animationCSS;
            document.head.appendChild(style);
        }
    }
};