// Übungsmodul für Gym Tracker

const Exercises = {
    // Zustandsvariablen
    exercises: [],
    currentExercise: null,
    isEditing: false,
    editingExerciseId: null,

    /**
     * Initialisiert das Übungsmodul
     */
    init() {
        this.setupEventListeners();
    },

    /**
     * Richtet Event-Listener ein
     */
    setupEventListeners() {
        const newExerciseForm = document.getElementById('newExerciseForm');
        if (newExerciseForm) {
            newExerciseForm.addEventListener('submit', this.handleCreateExercise.bind(this));
        }
    },

    /**
     * Lädt alle Übungen vom Server
     * @returns {Promise<Array>} - Array der Übungen
     */
    async loadAll() {
        try {
            const exercises = await Utils.apiCall('/exercises');
            this.exercises = exercises || [];
            this.updateExerciseSelect();
            return this.exercises;
        } catch (error) {
            console.error('Exercises: Ladefehler:', error);
            this.exercises = [];
            return [];
        }
    },

    /**
     * Lädt Übungsliste für Anzeige
     */
    async loadList() {
        try {
            App.showLoading('exercisesList');
            
            const exercises = await this.loadAll();
            this.displayExercisesList(exercises);
        } catch (error) {
            console.error('Exercises: Listen-Ladefehler:', error);
            Utils.showAlert('Fehler beim Laden der Übungen: ' + error.message, 'error');
            this.displayExercisesList([]);
        }
    },

    /**
     * Zeigt Übungsliste gruppiert nach Kategorien an
     * @param {Array} exercises - Array der anzuzeigenden Übungen
     */
    displayExercisesList(exercises) {
        const container = document.getElementById('exercisesList');
    /**
     * Validiert Übungsdaten
     * @param {object} data - Zu validierende Übungsdaten
     * @returns {string[]} - Array von Fehlermeldungen
     */
    validateExerciseData(data) {
        const errors = [];
        
        if (!data.name || data.name.trim().length < 2) {
            errors.push('Name muss mindestens 2 Zeichen lang sein');
        }
        
        if (!data.category) {
            errors.push('Kategorie ist erforderlich');
        }
        
        if (!data.muscle_group) {
            errors.push('Muskelgruppe ist erforderlich');
        }
        
        // Gültige Kategorien prüfen
        const validCategories = Utils.getExerciseCategories();
        if (data.category && !validCategories.includes(data.category)) {
            errors.push('Ungültige Kategorie');
        }
        
        // Gültige Muskelgruppen prüfen
        const validMuscleGroups = Utils.getMuscleGroups();
        if (data.muscle_group && !validMuscleGroups.includes(data.muscle_group)) {
            errors.push('Ungültige Muskelgruppe');
        }
        
        return errors;
    },

    /**
     * Exportiert Übungen als JSON
     */
    exportExercises() {
        if (!this.exercises.length) {
            Utils.showAlert('Keine Übungen zum Exportieren', 'warning');
            return;
        }

        const filename = `gym-tracker-exercises-${new Date().toISOString().split('T')[0]}.json`;
        Utils.downloadJSON(this.exercises, filename);
        Utils.showAlert('Übungen exportiert', 'success');
    },

    /**
     * Importiert Übungen aus JSON-Daten
     * @param {Array} exercisesData - Array von Übungsdaten
     */
    async importExercises(exercisesData) {
        if (!Array.isArray(exercisesData)) {
            throw new Error('Ungültiges Datenformat');
        }

        let imported = 0;
        let errors = 0;

        // Jede Übung einzeln importieren
        for (const exerciseData of exercisesData) {
            try {
                const validationErrors = this.validateExerciseData(exerciseData);
                if (validationErrors.length > 0) {
                    errors++;
                    continue;
                }

                await Utils.apiCall('/exercises', {
                    method: 'POST',
                    body: JSON.stringify(exerciseData)
                });
                imported++;
            } catch (error) {
                errors++;
            }
        }

        // Übungen neu laden
        await this.loadAll();
        if (App.currentSection === 'exercises') {
            this.loadList();
        }

        Utils.showAlert(`Import abgeschlossen: ${imported} erfolgreich, ${errors} Fehler`, 
                       errors > 0 ? 'warning' : 'success');
    }
};container) return;
        
        if (exercises.length === 0) {
            App.showEmptyState('exercisesList',
                'Noch keine Übungen vorhanden',
                {
                    text: 'Erste Übung erstellen',
                    action: 'Exercises.showNewModal()'
                }
            );
            return;
        }

        // Übungen nach Kategorie gruppieren
        const groupedExercises = exercises.reduce((groups, exercise) => {
            const category = exercise.category;
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(exercise);
            return groups;
        }, {});

        // HTML für jede Kategorie generieren
        container.innerHTML = Object.keys(groupedExercises).map(category => `
            <div style="margin-bottom: 30px;">
                <h3 style="color: var(--accent-primary); margin-bottom: 15px; border-bottom: 2px solid var(--accent-primary); padding-bottom: 5px;">
                    ${Utils.sanitizeInput(category)}
                </h3>
                <div>
                    ${groupedExercises[category].map(exercise => `
                        <div class="exercise-item">
                            <div class="exercise-name">${Utils.sanitizeInput(exercise.name)}</div>
                            <div class="exercise-details">
                                <span class="exercise-tag">${Utils.sanitizeInput(exercise.muscle_group)}</span>
                            </div>
                            ${exercise.description ? `
                                <div class="exercise-description">${Utils.sanitizeInput(exercise.description)}</div>
                            ` : ''}
                            ${exercise.instructions ? `
                                <div style="margin-top: 8px; color: var(--text-secondary); font-size: 13px;">
                                    <strong>Ausführung:</strong> ${Utils.sanitizeInput(exercise.instructions)}
                                </div>
                            ` : ''}
                            <div class="exercise-actions">
                                <button class="btn btn-info" onclick="Exercises.editExercise(${exercise.id})" title="Bearbeiten">
                                    Bearbeiten
                                </button>
                                <button class="btn btn-danger" onclick="Exercises.deleteExercise(${exercise.id})" title="Löschen">
                                    Löschen
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    },

    /**
     * Aktualisiert Dropdown-Auswahl für Übungen
     */
    updateExerciseSelect() {
        const select = document.getElementById('exerciseSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Übung auswählen --</option>';
        
        this.exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.id;
            option.textContent = `${exercise.name} (${exercise.muscle_group})`;
            select.appendChild(option);
        });
    },

    /**
     * Zeigt Modal für neue Übung an
     */
    showNewModal() {
        this.resetForm();
        const modal = document.getElementById('newExerciseModal');
        if (modal) {
            modal.style.display = 'block';
        }
    },

    /**
     * Schließt Modal für neue Übung
     */
    closeNewModal() {
        const modal = document.getElementById('newExerciseModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.resetForm();
    },

    /**
     * Setzt Übungsformular zurück
     */
    resetForm() {
        const form = document.getElementById('newExerciseForm');
        if (form) {
            form.reset();
        }
        
        this.isEditing = false;
        this.editingExerciseId = null;
        
        // Modal-Titel und Button zurücksetzen
        const modalTitle = document.querySelector('#newExerciseModal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Neue Übung erstellen';
        }
        
        const submitButton = document.querySelector('#newExerciseForm button[type="submit"]');
        if (submitButton) {
            submitButton.innerHTML = 'Übung speichern';
        }
    },

    /**
     * Lädt Übung zur Bearbeitung
     * @param {number} exerciseId - ID der zu bearbeitenden Übung
     */
    async editExercise(exerciseId) {
        try {
            const exercise = await Utils.apiCall(`/exercises/${exerciseId}`);
            
            // Bearbeitungsmodus setzen
            this.isEditing = true;
            this.editingExerciseId = exerciseId;
            
            // Formular mit Übungsdaten füllen
            document.getElementById('exerciseName').value = exercise.name;
            document.getElementById('exerciseCategory').value = exercise.category;
            document.getElementById('exerciseMuscleGroup').value = exercise.muscle_group;
            document.getElementById('exerciseDescription').value = exercise.description || '';
            document.getElementById('exerciseInstructions').value = exercise.instructions || '';
            
            // Modal-Titel und Button aktualisieren
            const modalTitle = document.querySelector('#newExerciseModal .modal-title');
            if (modalTitle) {
                modalTitle.textContent = 'Übung bearbeiten';
            }
            
            const submitButton = document.querySelector('#newExerciseForm button[type="submit"]');
            if (submitButton) {
                submitButton.innerHTML = 'Übung aktualisieren';
            }
            
            // Modal anzeigen
            const modal = document.getElementById('newExerciseModal');
            if (modal) {
                modal.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Exercises: Bearbeitungs-Ladefehler:', error);
            Utils.showAlert('Fehler beim Laden der Übung: ' + error.message, 'error');
        }
    },

    /**
     * Löscht eine Übung
     * @param {number} exerciseId - ID der zu löschenden Übung
     */
    async deleteExercise(exerciseId) {
        const exercise = this.getById(exerciseId);
        const exerciseName = exercise ? exercise.name : 'diese Übung';
        
        if (!confirm(`Sind Sie sicher, dass Sie "${exerciseName}" löschen möchten?`)) {
            return;
        }

        try {
            await Utils.apiCall(`/exercises/${exerciseId}`, {
                method: 'DELETE'
            });
            
            Utils.showAlert('Übung erfolgreich gelöscht!', 'success');
            
            // Übungen neu laden
            await this.loadAll();
            
            // Aktuelle Ansicht aktualisieren falls auf Übungsseite
            if (App.currentSection === 'exercises') {
                this.loadList();
            }
        } catch (error) {
            console.error('Exercises: Löschfehler:', error);
            Utils.showAlert('Fehler beim Löschen der Übung: ' + error.message, 'error');
        }
    },

    /**
     * Behandelt Übungserstellung/Aktualisierung
     * @param {Event} e - Form-Submit-Event
     */
    async handleCreateExercise(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            // Button-Zustand während Request ändern
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading"></div>';
            
            // Übungsdaten sammeln
            const exerciseData = {
                name: document.getElementById('exerciseName').value.trim(),
                category: document.getElementById('exerciseCategory').value,
                muscle_group: document.getElementById('exerciseMuscleGroup').value,
                description: document.getElementById('exerciseDescription').value.trim() || null,
                instructions: document.getElementById('exerciseInstructions').value.trim() || null
            };

            // Validierung
            if (!exerciseData.name) {
                throw new Error('Name ist erforderlich');
            }

            if (!exerciseData.category) {
                throw new Error('Kategorie ist erforderlich');
            }

            if (!exerciseData.muscle_group) {
                throw new Error('Muskelgruppe ist erforderlich');
            }

            let response;
            if (this.isEditing && this.editingExerciseId) {
                // Bestehende Übung aktualisieren
                response = await Utils.apiCall(`/exercises/${this.editingExerciseId}`, {
                    method: 'PUT',
                    body: JSON.stringify(exerciseData)
                });
                Utils.showAlert('Übung erfolgreich aktualisiert!', 'success');
            } else {
                // Neue Übung erstellen
                response = await Utils.apiCall('/exercises', {
                    method: 'POST',
                    body: JSON.stringify(exerciseData)
                });
                Utils.showAlert('Übung erfolgreich erstellt!', 'success');
            }

            this.closeNewModal();
            
            // Übungen neu laden
            await this.loadAll();
            
            // Aktuelle Ansicht aktualisieren falls auf Übungsseite
            if (App.currentSection === 'exercises') {
                this.loadList();
            }

            return response;
        } catch (error) {
            console.error('Exercises: Speicherfehler:', error);
            Utils.showAlert('Fehler beim Speichern der Übung: ' + error.message, 'error');
            throw error;
        } finally {
            // Button-Zustand zurücksetzen
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    /**
     * Schnelle Übungserstellung für Training-Workflow
     */
    async quickAdd() {
        const name = document.getElementById('quickExerciseName').value.trim();
        const category = document.getElementById('quickExerciseCategory').value;
        const muscle_group = document.getElementById('quickExerciseMuscle').value;
        
        if (!name || !category || !muscle_group) {
            Utils.showAlert('Bitte alle Felder für die neue Übung ausfüllen', 'warning');
            return;
        }
        
        try {
            const response = await Utils.apiCall('/exercises', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    category,
                    muscle_group,
                    description: null,
                    instructions: null
                })
            });
            
            if (response && response.exerciseId) {
                // Übungen neu laden
                await this.loadAll();
                
                // Neue Übung zum Training hinzufügen
                const newExercise = {
                    id: response.exerciseId,
                    name,
                    category,
                    muscle_group
                };
                
                const workoutExercise = {
                    exercise_id: newExercise.id,
                    exercise_name: newExercise.name,
                    muscle_group: newExercise.muscle_group,
                    sets_count: 3,
                    reps: [10, 10, 10],
                    weights: [0, 0, 0],
                    notes: ''
                };
                
                // Zu ausgewählten Übungen hinzufügen (falls Workouts-Modul verfügbar)
                if (typeof Workouts !== 'undefined') {
                    Workouts.selectedExercises.push(workoutExercise);
                    Workouts.updateSelectedExercisesDisplay();
                }
                
                // Quick-Add-Felder zurücksetzen
                document.getElementById('quickExerciseName').value = '';
                document.getElementById('quickExerciseCategory').value = '';
                document.getElementById('quickExerciseMuscle').value = '';
                
                Utils.showAlert('Übung erstellt und hinzugefügt!', 'success');
            }
        } catch (error) {
            console.error('Exercises: Quick-Add-Fehler:', error);
            Utils.showAlert('Fehler beim Erstellen der Übung: ' + error.message, 'error');
        }
    },

    /**
     * Gibt Übung nach ID zurück
     * @param {number} exerciseId - Übungs-ID
     * @returns {object|undefined} - Übungs-Objekt oder undefined
     */
    getById(exerciseId) {
        return this.exercises.find(ex => ex.id === exerciseId);
    },

    /**
     * Gibt Übungen nach Kategorie zurück
     * @param {string} category - Kategorie
     * @returns {Array} - Array der Übungen
     */
    getByCategory(category) {
        return this.exercises.filter(ex => ex.category === category);
    },

    /**
     * Gibt Übungen nach Muskelgruppe zurück
     * @param {string} muscleGroup - Muskelgruppe
     * @returns {Array} - Array der Übungen
     */
    getByMuscleGroup(muscleGroup) {
        return this.exercises.filter(ex => ex.muscle_group === muscleGroup);
    },

    /**
     * Durchsucht Übungen
     * @param {string} query - Suchbegriff
     * @returns {Array} - Array der gefundenen Übungen
     */
    search(query) {
        if (!query || query.length < 2) return this.exercises;
        
        const lowerQuery = query.toLowerCase();
        return this.exercises.filter(ex => 
            ex.name.toLowerCase().includes(lowerQuery) ||
            ex.category.toLowerCase().includes(lowerQuery) ||
            ex.muscle_group.toLowerCase().includes(lowerQuery) ||
            (ex.description && ex.description.toLowerCase().includes(lowerQuery))
        );
    },

    /**
     * Gibt Übungsstatistiken zurück
     * @returns {object|null} - Statistik-Objekt oder null
     */
    getExerciseStats() {
        if (!this.exercises.length) return null;

        // Kategorien-Statistiken
        const categoryStats = this.exercises.reduce((stats, ex) => {
            stats[ex.category] = (stats[ex.category] || 0) + 1;
            return stats;
        }, {});

        // Muskelgruppen-Statistiken
        const muscleGroupStats = this.exercises.reduce((stats, ex) => {
            stats[ex.muscle_group] = (stats[ex.muscle_group] || 0) + 1;
            return stats;
        }, {});

        return {
            total: this.exercises.length,
            categories: categoryStats,
            muscleGroups: muscleGroupStats,
            mostPopularCategory: Object.keys(categoryStats).reduce((a, b) => 
                categoryStats[a] > categoryStats[b] ? a : b
            ),
            mostPopularMuscleGroup: Object.keys(muscleGroupStats).reduce((a, b) => 
                muscleGroupStats[a] > muscleGroupStats[b] ? a : b
            )
        };
    },

    /**
     * Löscht zwischengespeicherte Daten
     */
    clearCache() {
        this.exercises = [];
        this.currentExercise = null;
        this.isEditing = false;
        this.editingExerciseId = null;
    },

    /**
     * Gibt Übungsdaten zurück
     * @returns {Array} - Array der Übungen
     */
    getExercises() {
        return this.exercises;
    },

    /**
     * Filtert Übungen für Dropdown-Auswahl
     * @param {string|null} category - Kategorie (optional)
     * @param {string|null} muscleGroup - Muskelgruppe (optional)
     * @returns {Array} - Gefilterte Übungen
     */
    filterForSelect(category = null, muscleGroup = null) {
        let filtered = this.exercises;
        
        if (category) {
            filtered = filtered.filter(ex => ex.category === category);
        }
        
        if (muscleGroup) {
            filtered = filtered.filter(ex => ex.muscle_group === muscleGroup);
        }
        
        return filtered;
    },

    /**
     * Validiert Übungsdaten
     * @param {object} data - Zu validierende Übungsdaten
     * @returns {string[]} - Array von Fehlermeldungen
     */
    validateExerciseData(data) {
        const errors = [];
        
        if (!