// Modals-Modul für Gym Tracker - Zentrale Modal-Verwaltung

const Modals = {
    /**
     * Initialisiert das Modal-System
     */
    init() {
        console.log('Modals: System initialisiert');
        this.setupGlobalListeners();
        this.createAdminModals();
        this.createExerciseModals();
        this.createWorkoutModals();
    },

    /**
     * Richtet globale Modal-Event-Listener ein
     */
    setupGlobalListeners() {
        // Modals schließen bei Klick außerhalb
        window.addEventListener('click', (event) => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Modals mit Escape-Taste schließen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            }
        });
    },

    /**
     * Erstellt Admin-bezogene Modals
     */
    createAdminModals() {
        const adminModalsHTML = `
            <!-- Modal: Passwort zurücksetzen (Admin) -->
            <div id="passwordResetModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Passwort zurücksetzen</h2>
                        <button class="close" onclick="Admin.closePasswordResetModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Passwort zurücksetzen für Benutzer: <strong id="resetUsername"></strong></p>
                        
                        <form id="adminPasswordResetForm">
                            <input type="hidden" id="resetUserId">
                            
                            <div class="form-group">
                                <label for="adminNewPassword">Neues Passwort *</label>
                                <input type="password" id="adminNewPassword" name="newPassword" required minlength="6">
                            </div>
                            
                            <div class="form-group">
                                <label for="adminConfirmPassword">Passwort bestätigen *</label>
                                <input type="password" id="adminConfirmPassword" name="confirmPassword" required minlength="6">
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-success">Übung speichern</button>
                                <button type="button" class="btn btn-outline" onclick="Exercises.closeNewModal()">Abbrechen</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.addToContainer(exerciseModalsHTML);
    },

    /**
     * Erstellt Training-bezogene Modals
     */
    createWorkoutModals() {
        const workoutModalsHTML = `
            <!-- Modal: Training Details -->
            <div id="workoutDetailModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Training Details</h2>
                        <button class="close" onclick="Workouts.closeDetailModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="workoutDetailContent">
                            <!-- Training-Details werden hier geladen -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addToContainer(workoutModalsHTML);
    },

    /**
     * Fügt HTML zum Modals-Container hinzu
     * @param {string} html - HTML-String
     */
    addToContainer(html) {
        let container = document.getElementById('modals-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modals-container';
            document.body.appendChild(container);
        }
        container.innerHTML += html;
    },

    /**
     * Zeigt Modal an
     * @param {string} modalId - ID des Modals
     */
    show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    },

    /**
     * Versteckt Modal
     * @param {string} modalId - ID des Modals
     */
    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    /**
     * Versteckt alle Modals
     */
    hideAll() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    },

    /**
     * Prüft ob ein Modal geöffnet ist
     * @returns {boolean} - True wenn Modal offen ist
     */
    isAnyModalOpen() {
        return Array.from(document.querySelectorAll('.modal')).some(modal => {
            return modal.style.display === 'block';
        });
    },

    /**
     * Gibt aktuell geöffnetes Modal zurück
     * @returns {Element|null} - Modal-Element oder null
     */
    getCurrentModal() {
        return Array.from(document.querySelectorAll('.modal')).find(modal => {
            return modal.style.display === 'block';
        });
    }
}; class="btn btn-warning">Passwort zurücksetzen</button>
                                <button type="button" class="btn btn-outline" onclick="Admin.closePasswordResetModal()">Abbrechen</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Modal: Benutzer löschen (Admin) -->
            <div id="deleteUserModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Benutzer löschen</h2>
                        <button class="close" onclick="Admin.closeDeleteUserModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <strong>Warnung:</strong> Diese Aktion kann nicht rückgängig gemacht werden!
                        </div>
                        
                        <p>Benutzer löschen: <strong id="deleteUsername"></strong></p>
                        <p>Alle Daten dieses Benutzers (Trainings, Übungen, etc.) werden permanent gelöscht.</p>
                        
                        <form id="deleteUserForm">
                            <input type="hidden" id="deleteUserId">
                            
                            <div class="form-group">
                                <label for="deleteConfirmation">Geben Sie "LÖSCHEN" ein, um zu bestätigen:</label>
                                <input type="text" id="deleteConfirmation" name="confirmation" required placeholder="LÖSCHEN">
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-danger">Benutzer löschen</button>
                                <button type="button" class="btn btn-outline" onclick="Admin.closeDeleteUserModal()">Abbrechen</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.addToContainer(adminModalsHTML);
    },

    /**
     * Erstellt Übungs-bezogene Modals
     */
    createExerciseModals() {
        const exerciseModalsHTML = `
            <!-- Modal: Neue Übung -->
            <div id="newExerciseModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Neue Übung erstellen</h2>
                        <button class="close" onclick="Exercises.closeNewModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="newExerciseForm">
                            <div class="form-group">
                                <label for="exerciseName">Name der Übung *</label>
                                <input type="text" id="exerciseName" name="exerciseName" required placeholder="z.B. Bankdrücken">
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="exerciseCategory">Kategorie *</label>
                                    <select id="exerciseCategory" name="exerciseCategory" required>
                                        <option value="">-- Wählen Sie eine Kategorie --</option>
                                        <option value="Krafttraining">Krafttraining</option>
                                        <option value="Cardio">Cardio</option>
                                        <option value="Stretching">Stretching</option>
                                        <option value="Functional">Functional</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="exerciseMuscleGroup">Muskelgruppe *</label>
                                    <select id="exerciseMuscleGroup" name="exerciseMuscleGroup" required>
                                        <option value="">-- Wählen Sie eine Muskelgruppe --</option>
                                        <option value="Brust">Brust</option>
                                        <option value="Rücken">Rücken</option>
                                        <option value="Schultern">Schultern</option>
                                        <option value="Arme">Arme</option>
                                        <option value="Beine">Beine</option>
                                        <option value="Core">Core</option>
                                        <option value="Cardio">Cardio</option>
                                        <option value="Ganzkörper">Ganzkörper</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="exerciseDescription">Beschreibung</label>
                                <textarea id="exerciseDescription" name="exerciseDescription" placeholder="Kurze Beschreibung der Übung..."></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="exerciseInstructions">Ausführung</label>
                                <textarea id="exerciseInstructions" name="exerciseInstructions" placeholder="Detaillierte Anleitung zur Ausführung..."></textarea>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit"