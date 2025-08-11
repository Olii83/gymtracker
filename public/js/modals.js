// Modals module for Gym Tracker - Central modal management
// Save as: public/js/modals.js

const Modals = {
    // Initialize modal system
    init() {
        console.log('Modals system initialized');
        this.setupGlobalListeners();
        this.createAdminModals();
        this.createExerciseModals();
        this.createWorkoutModals();
    },

    // Setup global modal event listeners
    setupGlobalListeners() {
        // Close modals when clicking outside
        window.addEventListener('click', (event) => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close modals with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            }
        });
    },

    // Create admin-related modals
    createAdminModals() {
        const adminModalsHTML = `
            <!-- Modal: Password Reset (Admin) -->
            <div id="passwordResetModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">🔑 Passwort zurücksetzen</h2>
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
                            
                            <div style="text-align: center; margin-top: 20px;">
                                <button type="submit" class="btn btn-warning">🔑 Passwort zurücksetzen</button>
                                <button type="button" class="btn btn-outline" onclick="Admin.closePasswordResetModal()">❌ Abbrechen</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Modal: Delete User (Admin) -->
            <div id="deleteUserModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">🗑️ Benutzer löschen</h2>
                        <button class="close" onclick="Admin.closeDeleteUserModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <strong>⚠️ Warnung:</strong> Diese Aktion kann nicht rückgängig gemacht werden!
                        </div>
                        
                        <p>Benutzer löschen: <strong id="deleteUsername"></strong></p>
                        <p>Alle Daten dieses Benutzers (Trainings, Übungen, etc.) werden permanent gelöscht.</p>
                        
                        <form id="deleteUserForm">
                            <input type="hidden" id="deleteUserId">
                            
                            <div class="form-group">
                                <label for="deleteConfirmation">Geben Sie "LÖSCHEN" ein, um zu bestätigen:</label>
                                <input type="text" id="deleteConfirmation" name="confirmation" required placeholder="LÖSCHEN">
                            </div>
                            
                            <div style="text-align: center; margin-top: 20px;">
                                <button type="submit" class="btn btn-danger">🗑️ Benutzer löschen</button>
                                <button type="button" class="btn btn-outline" onclick="Admin.closeDeleteUserModal()">❌ Abbrechen</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.addToContainer(adminModalsHTML);
    },

    // Create exercise-related modals
    createExerciseModals() {
        const exerciseModalsHTML = `
            <!-- Modal: New Exercise -->
            <div id="newExerciseModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">💪 Neue Übung erstellen</h2>
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
                            
                            <div style="text-align: center; margin-top: 20px;">
                                <button type="submit" class="btn btn-success">💾 Übung speichern</button>
                                <button type="button" class="btn btn-outline" onclick="Exercises.closeNewModal()">❌ Abbrechen</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.addToContainer(exerciseModalsHTML);
    },

    // Create workout-related modals
    createWorkoutModals() {
        const workoutModalsHTML = `
            <!-- Modal: Workout Detail -->
            <div id="workoutDetailModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">🏋️ Training Details</h2>
                        <button class="close" onclick="Workouts.closeDetailModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="workoutDetailContent">
                            <!-- Workout details will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addToContainer(workoutModalsHTML);
    },

    // Add HTML to modals container
    addToContainer(html) {
        let container = document.getElementById('modals-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modals-container';
            document.body.appendChild(container);
        }
        container.innerHTML += html;
    },

    // Generic modal functions
    show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    },

    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    hideAll() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    },

    // Check if any modal is open
    isAnyModalOpen() {
        return Array.from(document.querySelectorAll('.modal')).some(modal => {
            return modal.style.display === 'block';
        });
    },

    // Get currently open modal
    getCurrentModal() {
        return Array.from(document.querySelectorAll('.modal')).find(modal => {
            return modal.style.display === 'block';
        });
    }
};
