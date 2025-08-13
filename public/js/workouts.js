// Trainingsmodul für Gym Tracker

const Workouts = {
    // Zustandsvariablen
    workouts: [],
    selectedExercises: [],
    currentWorkout: null,
    isEditing: false,
    editingWorkoutId: null,

    /**
     * Initialisiert das Trainingsmodul
     */
    init() {
        this.setupEventListeners();
        console.log('Workouts: Modul initialisiert');
    },

    /**
     * Richtet Event-Listener ein
     */
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            const newWorkoutForm = document.getElementById('newWorkoutForm');
            if (newWorkoutForm) {
                newWorkoutForm.addEventListener('submit', this.handleCreateWorkout.bind(this));
            }
        });
    },

    /**
     * Lädt alle Trainings des Benutzers
     */
    async loadAll() {
        try {
            App.showLoading('workoutsList');
            
            const workouts = await Utils.apiCall('/workouts');
            this.workouts = workouts || [];
            this.displayWorkouts(this.workouts);
        } catch (error) {
            console.error('Workouts: Ladefehler:', error);
            Utils.showAlert('Fehler beim Laden der Trainings: ' + error.message, 'error');
            this.displayWorkouts([]);
        }
    },

    /**
     * Zeigt Trainings-Liste an
     * @param {Array} workouts - Array der anzuzeigenden Trainings
     */
    displayWorkouts(workouts) {
        const container = document.getElementById('workoutsList');
        if (!container) return;
        
        if (workouts.length === 0) {
            App.showEmptyState('workoutsList', 
                'Noch keine Trainings vorhanden',
                { 
                    text: 'Erstes Training erstellen',
                    action: "App.showSection('newWorkout')"
                }
            );
            return;
        }

        // Trainings-HTML generieren
        container.innerHTML = workouts.map(workout => `
            <div class="workout-item">
                <div class="workout-date">${Utils.formatDate(workout.date)}</div>
                <div class="workout-name">${Utils.sanitizeInput(workout.name)}</div>
                ${workout.notes ? `
                    <div style="color: var(--text-secondary); font-size: 14px; margin-top: 5px;">
                        ${Utils.sanitizeInput(workout.notes)}
                    </div>
                ` : ''}
                <div style="margin-top: 10px; display: flex; gap: 10px;">
                    <button class="btn btn-outline" onclick="Workouts.showDetail(${workout.id})">
                        Anzeigen
                    </button>
                    <button class="btn btn-info" onclick="Workouts.editWorkout(${workout.id})">
                        Bearbeiten
                    </button>
                    <button class="btn btn-danger" onclick="Workouts.delete(${workout.id})">
                        Löschen
                    </button>
                </div>
            </div>
        `).join('');
    },

    /**
     * Zeigt Training-Details in Modal an
     * @param {number} workoutId - ID des Trainings
     */
    async showDetail(workoutId) {
        try {
            const workout = await Utils.apiCall(`/workouts/${workoutId}`);
            this.currentWorkout = workout;
            
            const modal = document.getElementById('workoutDetailModal');
            const content = document.getElementById('workoutDetailContent');
            
            if (modal && content) {
                content.innerHTML = this.generateWorkoutDetailHTML(workout);
                modal.style.display = 'block';
            }
        } catch (error) {
            console.error('Workouts: Detail-Ladefehler:', error);
            Utils.showAlert('Fehler beim Laden der Trainingsdetails: ' + error.message, 'error');
        }
    },

    /**
     * Generiert HTML für Training-Details
     * @param {object} workout - Training-Objekt
     * @returns {string} - HTML-String
     */
    generateWorkoutDetailHTML(workout) {
        const exercisesHTML = workout.exercises && workout.exercises.length > 0 ? `
            <h3 style="margin-bottom: 15px; color: var(--text-primary);">Übungen</h3>
            <div>
                ${workout.exercises.map(ex => `
                    <div class="exercise-item">
                        <div class="exercise-name">${Utils.sanitizeInput(ex.exercise_name)}</div>
                        <div class="exercise-details">
                            <span class="exercise-tag">${Utils.sanitizeInput(ex.category || '')}</span>
                            <span class="exercise-tag">${Utils.sanitizeInput(ex.muscle_group || '')}</span>
                            <span class="exercise-tag">${ex.sets_count} Sätze</span>
                        </div>
                        ${ex.reps && ex.reps.length > 0 ? `
                            <div style="margin-top: 10px;">
                                <strong>Wiederholungen:</strong> ${ex.reps.join(', ')}
                            </div>
                        ` : ''}
                        ${ex.weights && ex.weights.length > 0 && ex.weights.some(w => w > 0) ? `
                            <div>
                                <strong>Gewichte (kg):</strong> ${ex.weights.join(', ')}
                            </div>
                        ` : ''}
                        ${ex.notes ? `
                            <div style="margin-top: 5px;">
                                <strong>Notizen:</strong> ${Utils.sanitizeInput(ex.notes)}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        ` : '<p style="color: var(--text-secondary);">Keine Übungen erfasst.</p>';

        return `
            <h2 style="margin-bottom: 20px; color: var(--text-primary);">${Utils.sanitizeInput(workout.name)}</h2>
            <div style="margin-bottom: 20px;">
                <p><strong>Datum:</strong> ${Utils.formatDate(workout.date)}</p>
                ${workout.notes ? `<p><strong>Notizen:</strong> ${Utils.sanitizeInput(workout.notes)}</p>` : ''}
            </div>
            
            ${exercisesHTML}
            
            <div style="margin-top: 30px; display: flex; gap: 10px;">
                <button class="btn btn-info" onclick="Workouts.editWorkout(${workout.id})">Bearbeiten</button>
                <button class="btn btn-danger" onclick="Workouts.delete(${workout.id})">Löschen</button>
                <button class="btn btn-outline" onclick="Workouts.closeDetailModal()">Schließen</button>
            </div>
        `;
    },

    /**
     * Schließt Training-Detail-Modal
     */
    closeDetailModal() {
        const modal = document.getElementById('workoutDetailModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentWorkout = null;
    },

    /**
     * Lädt Training zur Bearbeitung
     * @param {number} workoutId - ID des zu bearbeitenden Trainings
     */
    async editWorkout(workoutId) {
        try {
            const workout = await Utils.apiCall(`/workouts/${workoutId}`);
            
            // Bearbeitungsmodus aktivieren
            this.isEditing = true;
            this.editingWorkoutId = workoutId;
            
            // Formular mit Training-Daten füllen
            document.getElementById('workoutName').value = workout.name;
            document.getElementById('workoutDate').value = workout.date;
            document.getElementById('workoutNotes').value = workout.notes || '';
            
            // Übungen laden wenn vorhanden
            if (workout.exercises && workout.exercises.length > 0) {
                this.selectedExercises = workout.exercises.map(ex => ({
                    exercise_id: ex.exercise_id,
                    exercise_name: ex.exercise_name,
                    muscle_group: ex.muscle_group,
                    sets_count: ex.sets_count,
                    reps: [...ex.reps],
                    weights: [...ex.weights],
                    notes: ex.notes
                }));
                this.updateSelectedExercisesDisplay();
            }
            
            // Formular-Titel und Button aktualisieren
            const sectionTitle = document.querySelector('#newWorkout .section-title');
            if (sectionTitle) {
                sectionTitle.textContent = 'Training bearbeiten';
            }
            
            const submitButton = document.querySelector('#newWorkoutForm button[type="submit"]');
            if (submitButton) {
                submitButton.innerHTML = 'Training aktualisieren';
            }
            
            // Detail-Modal schließen falls offen
            this.closeDetailModal();
            
            // Zur Training-Formular-Sektion wechseln
            App.showSection('newWorkout');
            
            Utils.showAlert('Training zum Bearbeiten geladen', 'info');
        } catch (error) {
            console.error('Workouts: Bearbeitungs-Ladefehler:', error);
            Utils.showAlert('Fehler beim Laden des Trainings: ' + error.message, 'error');
        }
    },

    /**
     * Löscht ein Training
     * @param {number} workoutId - ID des zu löschenden Trainings
     */
    async delete(workoutId) {
        if (!confirm('Sind Sie sicher, dass Sie dieses Training löschen möchten?')) {
            return;
        }

        try {
            await Utils.apiCall(`/workouts/${workoutId}`, { method: 'DELETE' });
            Utils.showAlert('Training erfolgreich gelöscht!', 'success');
            this.closeDetailModal();
            this.loadAll();
            App.refresh(); // Dashboard aktualisieren falls aktuelle Sektion
        } catch (error) {
            console.error('Workouts: Löschfehler:', error);
            Utils.showAlert('Fehler beim Löschen des Trainings: ' + error.message, 'error');
        }
    },

    /**
     * Setzt Training-Formular zurück
     */
    resetForm() {
        const form = document.getElementById('newWorkoutForm');
        if (form) {
            form.reset();
        }
        
        const selectedExercisesContainer = document.getElementById('selectedExercises');
        if (selectedExercisesContainer) {
            selectedExercisesContainer.innerHTML = '';
        }
        
        // Zustand zurücksetzen
        this.selectedExercises = [];
        this.isEditing = false;
        this.editingWorkoutId = null;
        
        // Formular-Titel und Button zurücksetzen
        const sectionTitle = document.querySelector('#newWorkout .section-title');
        if (sectionTitle) {
            sectionTitle.textContent = 'Neues Training';
        }
        
        const submitButton = document.querySelector('#newWorkoutForm button[type="submit"]');
        if (submitButton) {
            submitButton.innerHTML = 'Training speichern';
        }
        
        // Heutiges Datum setzen
        const workoutDateInput = document.getElementById('workoutDate');
        if (workoutDateInput) {
            workoutDateInput.value = Utils.getCurrentDate();
        }
        
        console.log('Workouts: Formular zurückgesetzt');
    },

    /**
     * Fügt Übung zum Training hinzu
     */
    addExercise() {
        const select = document.getElementById('exerciseSelect');
        if (!select) {
            console.error('Workouts: Übungsauswahl nicht gefunden');
            return;
        }
        
        const exerciseId = parseInt(select.value);
        
        if (!exerciseId) {
            Utils.showAlert('Bitte wählen Sie eine Übung aus.', 'warning');
            return;
        }

        // Prüfen ob Übung bereits hinzugefügt
        if (this.selectedExercises.find(ex => ex.exercise_id === exerciseId)) {
            Utils.showAlert('Diese Übung ist bereits hinzugefügt.', 'warning');
            return;
        }

        // Prüfen ob Exercises-Modul geladen
        if (!Exercises || !Exercises.exercises) {
            Utils.showAlert('Übungen noch nicht geladen. Bitte warten Sie einen Moment.', 'warning');
            return;
        }

        const exercise = Exercises.getById(exerciseId);
        if (!exercise) {
            Utils.showAlert('Übung nicht gefunden.', 'error');
            return;
        }

        // Neue Workout-Übung erstellen
        const workoutExercise = {
            exercise_id: exerciseId,
            exercise_name: exercise.name,
            muscle_group: exercise.muscle_group,
            sets_count: 3,
            reps: [10, 10, 10],
            weights: [0, 0, 0],
            notes: ''
        };

        this.selectedExercises.push(workoutExercise);
        console.log('Workouts: Übung hinzugefügt:', workoutExercise);
        this.updateSelectedExercisesDisplay();
        
        select.value = '';
        Utils.showAlert('Übung hinzugefügt!', 'success');
    },

    /**
     * Aktualisiert Anzeige der ausgewählten Übungen
     */
    updateSelectedExercisesDisplay() {
        const container = document.getElementById('selectedExercises');
        if (!container) {
            console.error('Workouts: Container für ausgewählte Übungen nicht gefunden');
            return;
        }
        
        if (this.selectedExercises.length === 0) {
            container.innerHTML = '';
            return;
        }

        console.log('Workouts: Aktualisiere Anzeige der ausgewählten Übungen:', this.selectedExercises);

        container.innerHTML = `
            <h3 style="margin-bottom: 15px; color: var(--text-primary);">Ausgewählte Übungen:</h3>
            ${this.selectedExercises.map((exercise, index) => `
                <div class="selected-exercise">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4 style="color: var(--text-primary);">${Utils.sanitizeInput(exercise.exercise_name)}</h4>
                        <button type="button" class="btn btn-danger" onclick="Workouts.removeExercise(${index})" style="padding: 5px 10px; font-size: 12px;">
                            Entfernen
                        </button>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label>Anzahl Sätze:</label>
                        <input type="number" min="1" max="10" value="${exercise.sets_count}" 
                               onchange="Workouts.updateExerciseSets(${index}, this.value)" 
                               style="width: 80px; margin-left: 10px; padding: 5px;">
                    </div>
                    
                    <div class="sets-input" id="sets-${index}">
                        <!-- Sätze werden hier generiert -->
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <label>Notizen:</label>
                        <input type="text" placeholder="Besonderheiten, Technik-Tipps..." 
                               value="${exercise.notes || ''}"
                               onchange="Workouts.selectedExercises[${index}].notes = this.value"
                               style="width: 100%; margin-top: 5px; padding: 8px;">
                    </div>
                </div>
            `).join('')}
        `;

        // Sätze-Anzeige für jede Übung generieren
        this.selectedExercises.forEach((exercise, index) => {
            this.updateSetsDisplay(index);
        });
    },

    /**
     * Aktualisiert Anzahl der Sätze für eine Übung
     * @param {number} exerciseIndex - Index der Übung
     * @param {string} setsCount - Neue Anzahl Sätze
     */
    updateExerciseSets(exerciseIndex, setsCount) {
        const count = parseInt(setsCount);
        if (count < 1 || count > 10) return;

        const exercise = this.selectedExercises[exerciseIndex];
        exercise.sets_count = count;
        
        // Arrays anpassen
        while (exercise.reps.length < count) {
            exercise.reps.push(exercise.reps[exercise.reps.length - 1] || 10);
            exercise.weights.push(exercise.weights[exercise.weights.length - 1] || 0);
        }
        
        exercise.reps = exercise.reps.slice(0, count);
        exercise.weights = exercise.weights.slice(0, count);
        
        this.updateSetsDisplay(exerciseIndex);
    },

    /**
     * Aktualisiert Sätze-Anzeige für eine Übung
     * @param {number} exerciseIndex - Index der Übung
     */
    updateSetsDisplay(exerciseIndex) {
        const exercise = this.selectedExercises[exerciseIndex];
        const container = document.getElementById(`sets-${exerciseIndex}`);
        if (!container) return;
        
        container.innerHTML = Array.from({ length: exercise.sets_count }, (_, setIndex) => `
            <div class="set-input">
                <label>Satz ${setIndex + 1}</label>
                <input type="number" placeholder="Wdh." min="1" max="100" 
                       value="${exercise.reps[setIndex] || ''}"
                       onchange="Workouts.selectedExercises[${exerciseIndex}].reps[${setIndex}] = parseInt(this.value) || 0">
                <input type="number" placeholder="Gewicht (kg)" min="0" max="1000" step="0.5"
                       value="${exercise.weights[setIndex] || ''}"
                       onchange="Workouts.selectedExercises[${exerciseIndex}].weights[${setIndex}] = parseFloat(this.value) || 0">
            </div>
        `).join('');
    },

    /**
     * Entfernt Übung aus Training
     * @param {number} index - Index der zu entfernenden Übung
     */
    removeExercise(index) {
        console.log('Workouts: Entferne Übung bei Index:', index);
        this.selectedExercises.splice(index, 1);
        this.updateSelectedExercisesDisplay();
        Utils.showAlert('Übung entfernt', 'info');
    },

    /**
     * Behandelt Training-Erstellung/Aktualisierung
     * @param {Event} e - Form-Submit-Event
     */
    async handleCreateWorkout(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            // Button-Zustand während Request ändern
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading"></div> Speichern...';
            
            // Training-Daten sammeln
            const workoutData = {
                name: document.getElementById('workoutName').value.trim(),
                date: document.getElementById('workoutDate').value,
                notes: document.getElementById('workoutNotes').value.trim() || null,
                exercises: this.selectedExercises
            };

            // Validierung
            if (!workoutData.name) {
                throw new Error('Trainingsname ist erforderlich');
            }

            if (!workoutData.date) {
                throw new Error('Datum ist erforderlich');
            }

            console.log('Workouts: Speichere Training:', workoutData);

            let response;
            if (this.isEditing && this.editingWorkoutId) {
                // Bestehendes Training aktualisieren
                response = await Utils.apiCall(`/workouts/${this.editingWorkoutId}`, {
                    method: 'PUT',
                    body: JSON.stringify(workoutData)
                });
                Utils.showAlert('Training erfolgreich aktualisiert!', 'success');
            } else {
                // Neues Training erstellen
                response = await Utils.apiCall('/workouts', {
                    method: 'POST',
                    body: JSON.stringify(workoutData)
                });
                Utils.showAlert('Training erfolgreich gespeichert!', 'success');
            }

            console.log('Workouts: Training gespeichert:', response);
            this.resetForm();
            App.showSection('dashboard');
        } catch (error) {
            console.error('Workouts: Speicherfehler:', error);
            Utils.showAlert('Fehler beim Speichern des Trainings: ' + error.message, 'error');
        } finally {
            // Button-Zustand zurücksetzen
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    /**
     * Lädt Vorlage in Training-Formular
     * @param {number} templateId - ID der Vorlage
     */
    async loadTemplate(templateId) {
        if (!templateId) {
            console.log('Workouts: Keine Vorlage ausgewählt');
            return;
        }
        
        try {
            console.log('Workouts: Lade Vorlage:', templateId);
            const template = await Utils.apiCall(`/templates/${templateId}`);
            
            // Formular mit Vorlagen-Daten füllen
            document.getElementById('workoutName').value = template.name;
            document.getElementById('workoutDate').value = Utils.getCurrentDate();
            
            // Vorlagen-Übungen in Training laden
            if (template.exercises && template.exercises.length > 0) {
                this.selectedExercises = template.exercises.map(ex => ({
                    exercise_id: ex.exercise_id,
                    exercise_name: ex.exercise_name,
                    muscle_group: ex.muscle_group,
                    sets_count: ex.suggested_sets || 3,
                    reps: ex.suggested_reps || [10, 10, 10],
                    weights: new Array(ex.suggested_sets || 3).fill(0),
                    notes: ''
                }));
                
                this.updateSelectedExercisesDisplay();
            }
            
            Utils.showAlert('Vorlage geladen!', 'success');
        } catch (error) {
            console.error('Workouts: Vorlagen-Ladefehler:', error);
            Utils.showAlert('Fehler beim Laden der Vorlage: ' + error.message, 'error');
        }
    },

    /**
     * Gibt Training nach ID zurück
     * @param {number} workoutId - Training-ID
     * @returns {object|undefined} - Training-Objekt oder undefined
     */
    getById(workoutId) {
        return this.workouts.find(w => w.id === workoutId);
    },

    /**
     * Löscht zwischengespeicherte Daten
     */
    clearCache() {
        this.workouts = [];
        this.selectedExercises = [];
        this.currentWorkout = null;
        this.isEditing = false;
        this.editingWorkoutId = null;
    },

    /**
     * Gibt Trainings-Daten zurück
     * @returns {Array} - Array der Trainings
     */
    getWorkouts() {
        return this.workouts;
    },

    /**
     * Gibt ausgewählte Übungen zurück
     * @returns {Array} - Array der ausgewählten Übungen
     */
    getSelectedExercises() {
        return this.selectedExercises;
    },

    /**
     * Gibt Training-Statistiken zurück
     * @returns {object|null} - Statistik-Objekt oder null
     */
    getWorkoutStats() {
        if (!this.workouts.length) return null;

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const thisWeek = this.workouts.filter(w => new Date(w.date) >= oneWeekAgo);
        const thisMonth = this.workouts.filter(w => new Date(w.date) >= oneMonthAgo);

        return {
            total: this.workouts.length,
            thisWeek: thisWeek.length,
            thisMonth: thisMonth.length,
            mostRecentDate: this.workouts.length > 0 ? 
                Math.max(...this.workouts.map(w => new Date(w.date).getTime())) : null
        };
    },

    /**
     * Dupliziert ein Training
     * @param {number} workoutId - ID des zu duplizierenden Trainings
     */
    duplicateWorkout(workoutId) {
        const workout = this.getById(workoutId);
        if (!workout) {
            Utils.showAlert('Training nicht gefunden', 'error');
            return;
        }

        // Formular mit Training-Daten vorausfüllen
        document.getElementById('workoutName').value = workout.name + ' (Kopie)';
        document.getElementById('workoutDate').value = Utils.getCurrentDate();
        document.getElementById('workoutNotes').value = workout.notes || '';

        // Übungen kopieren falls vorhanden
        if (workout.exercises && workout.exercises.length > 0) {
            this.selectedExercises = workout.exercises.map(ex => ({
                exercise_id: ex.exercise_id,
                exercise_name: ex.exercise_name,
                muscle_group: ex.muscle_group,
                sets_count: ex.sets_count,
                reps: [...ex.reps],
                weights: [...ex.weights],
                notes: ex.notes
            }));
            this.updateSelectedExercisesDisplay();
        }

        App.showSection('newWorkout');
        Utils.showAlert('Training zum Duplizieren vorbereitet', 'info');
    }
};