// Trainingsmodul für Gym Tracker - Überarbeitete Version
// Verwaltet die Erstellung, Anzeige und Bearbeitung von Trainingseinheiten.

const Workouts = {
    // Zustandsvariablen
    workouts: [],
    selectedExercises: [],
    currentWorkout: null,
    isEditing: false,
    editingWorkoutId: null,

    /**
     * Initialisiert das Trainingsmodul.
     */
    init() {
        console.log('Workouts: Modul initialisiert');
        this.setupEventListeners();
    },

    /**
     * Richtet Event-Listener für das Modul ein.
     */
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            const newWorkoutForm = document.getElementById('newWorkoutForm');
            if (newWorkoutForm) {
                newWorkoutForm.addEventListener('submit', this.handleCreateWorkout.bind(this));
            }
        });
        
        // Event-Delegation für dynamisch erstellte Buttons
        Utils.delegate(document.body, 'click', '.edit-workout-btn', (event) => {
            const workoutId = event.target.closest('button').dataset.id;
            this.startEdit(workoutId);
        });

        Utils.delegate(document.body, 'click', '.delete-workout-btn', (event) => {
            const workoutId = event.target.closest('button').dataset.id;
            this.handleDeleteWorkout(workoutId);
        });
        
        Utils.delegate(document.body, 'click', '.duplicate-workout-btn', (event) => {
            const workoutId = event.target.closest('button').dataset.id;
            this.duplicateWorkout(workoutId);
        });
        
        Utils.delegate(document.body, 'click', '.add-exercise-btn', this.showExerciseSelectionModal.bind(this));
    },

    /**
     * Läd alle Trainings des Benutzers von der API.
     */
    async loadAll() {
        try {
            App.showLoading('workoutsList');
            const workouts = await Utils.apiCall('/workouts');
            this.workouts = workouts || [];
            this.displayWorkouts(this.workouts);
            App.hideLoading('workoutsList');
        } catch (error) {
            console.error('Workouts: Ladefehler:', error);
            Utils.showAlert('Fehler beim Laden der Trainings: ' + error.message, 'error');
            this.displayWorkouts([]);
            App.hideLoading('workoutsList');
        }
    },

    /**
     * Zeigt die Liste der Trainings an.
     * @param {Array<object>} workouts - Array der anzuzeigenden Trainings.
     */
    displayWorkouts(workouts) {
        const container = document.getElementById('workoutsList');
        if (!container) return;
        
        container.innerHTML = '';
        if (workouts.length === 0) {
            container.innerHTML = '<p class="text-center">Keine Trainings gefunden.</p>';
            return;
        }

        const listHTML = workouts.map(w => `
            <div class="workout-card">
                <h3>${w.name}</h3>
                <p><strong>Datum:</strong> ${Utils.formatDate(w.date)}</p>
                <div class="workout-actions">
                    <button class="btn btn-sm btn-info edit-workout-btn" data-id="${w.id}">Bearbeiten</button>
                    <button class="btn btn-sm btn-secondary duplicate-workout-btn" data-id="${w.id}">Duplizieren</button>
                    <button class="btn btn-sm btn-danger delete-workout-btn" data-id="${w.id}">Löschen</button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = listHTML;
    },

    /**
     * Behandelt das Hinzufügen oder Bearbeiten eines Workouts.
     * @param {Event} event - Das Formular-Submit-Event.
     */
    async handleCreateWorkout(event) {
        event.preventDefault();
        
        const form = event.target;
        const workoutData = {
            name: form.workoutName.value,
            date: form.workoutDate.value,
            notes: form.workoutNotes.value,
            exercises: this.selectedExercises,
        };

        if (this.isEditing) {
            await this.updateWorkout(this.editingWorkoutId, workoutData);
        } else {
            await this.createWorkout(workoutData);
        }
    },

    /**
     * Erstellt ein neues Training über die API.
     * @param {object} workoutData - Die Daten des neuen Trainings.
     */
    async createWorkout(workoutData) {
        try {
            await Utils.apiCall('/workouts', {
                method: 'POST',
                body: JSON.stringify(workoutData)
            });
            
            Utils.showAlert('Training erfolgreich erstellt!', 'success');
            App.showSection('workouts');
            this.clearWorkoutForm();
            this.loadAll();
        } catch (error) {
            console.error('Workouts: Erstellungsfehler:', error);
            Utils.showAlert('Fehler beim Erstellen des Trainings: ' + error.message, 'error');
        }
    },
    
    /**
     * Aktualisiert ein bestehendes Training über die API.
     * @param {string} workoutId - Die ID des zu aktualisierenden Trainings.
     * @param {object} workoutData - Die aktualisierten Daten.
     */
    async updateWorkout(workoutId, workoutData) {
        try {
            await Utils.apiCall(`/workouts/${workoutId}`, {
                method: 'PUT',
                body: JSON.stringify(workoutData)
            });
            
            Utils.showAlert('Training erfolgreich aktualisiert!', 'success');
            App.showSection('workouts');
            this.stopEdit();
            this.loadAll();
        } catch (error) {
            console.error('Workouts: Update-Fehler:', error);
            Utils.showAlert('Fehler beim Aktualisieren des Trainings: ' + error.message, 'error');
        }
    },

    /**
     * Löscht ein Training.
     * @param {string} workoutId - Die ID des zu löschenden Trainings.
     */
    async handleDeleteWorkout(workoutId) {
        Modals.showConfirmationModal('Möchtest du dieses Training wirklich löschen?', async () => {
            try {
                await Utils.apiCall(`/workouts/${workoutId}`, {
                    method: 'DELETE'
                });
                
                Utils.showAlert('Training erfolgreich gelöscht!', 'success');
                this.loadAll();
            } catch (error) {
                console.error('Workouts: Löschfehler:', error);
                Utils.showAlert('Fehler beim Löschen des Trainings: ' + error.message, 'error');
            }
        });
    },

    /**
     * Startet den Bearbeitungsmodus für ein Training.
     * @param {string} workoutId - Die ID des zu bearbeitenden Trainings.
     */
    startEdit(workoutId) {
        const workout = this.workouts.find(w => w.id === workoutId);
        if (!workout) {
            Utils.showAlert('Training nicht gefunden', 'error');
            return;
        }

        this.isEditing = true;
        this.editingWorkoutId = workoutId;
        this.currentWorkout = workout;
        this.populateForm(workout);
        App.showSection('newWorkout');
        document.getElementById('newWorkoutFormButton').textContent = 'Aktualisieren';
    },

    /**
     * Beendet den Bearbeitungsmodus und setzt den Zustand zurück.
     */
    stopEdit() {
        this.isEditing = false;
        this.editingWorkoutId = null;
        this.currentWorkout = null;
        this.clearWorkoutForm();
    },

    /**
     * Füllt das Trainings-Formular mit den Daten des zu bearbeitenden Workouts.
     * @param {object} workout - Das Workout-Objekt.
     */
    populateForm(workout) {
        const form = document.getElementById('newWorkoutForm');
        if (form) {
            form.workoutName.value = workout.name;
            form.workoutDate.value = workout.date;
            form.workoutNotes.value = workout.notes || '';
        }
        
        this.selectedExercises = [...workout.exercises];
        this.updateSelectedExercisesDisplay();
    },
    
    /**
     * Setzt das Trainings-Formular auf den Anfangszustand zurück.
     */
    clearWorkoutForm() {
        const form = document.getElementById('newWorkoutForm');
        if (form) {
            form.reset();
        }
        this.selectedExercises = [];
        this.updateSelectedExercisesDisplay();
        document.getElementById('newWorkoutFormButton').textContent = 'Training erstellen';
    },

    /**
     * Aktualisiert die Anzeige der ausgewählten Übungen im Formular.
     */
    updateSelectedExercisesDisplay() {
        const container = document.getElementById('selectedExercisesList');
        if (!container) return;
        
        container.innerHTML = '';
        if (this.selectedExercises.length === 0) {
            container.innerHTML = '<p class="text-center">Keine Übungen hinzugefügt.</p>';
            return;
        }

        const listHTML = this.selectedExercises.map(ex => `
            <div class="selected-exercise-card">
                <h4>${ex.exercise_name}</h4>
                <p><strong>Muskelgruppe:</strong> ${ex.muscle_group}</p>
                <div class="exercise-details">
                    <!-- Hier könnten Details wie Sätze, Wiederholungen, Gewicht angezeigt werden -->
                </div>
            </div>
        `).join('');
        
        container.innerHTML = listHTML;
    },

    /**
     * Gibt ein Training anhand seiner ID zurück.
     * @param {string} workoutId - Die ID des gesuchten Trainings.
     * @returns {object|undefined} - Das Workout-Objekt oder undefined.
     */
    getById(workoutId) {
        return this.workouts.find(w => w.id === workoutId);
    },

    /**
     * Dupliziert ein Training.
     * @param {string} workoutId - Die ID des zu duplizierenden Trainings.
     */
    duplicateWorkout(workoutId) {
        const workout = this.getById(workoutId);
        if (!workout) {
            Utils.showAlert('Training nicht gefunden', 'error');
            return;
        }

        // Formular mit Workout-Daten vorausfüllen
        this.isEditing = false;
        this.editingWorkoutId = null;
        document.getElementById('workoutName').value = workout.name + ' (Kopie)';
        document.getElementById('workoutDate').value = Utils.getCurrentDate();
        document.getElementById('workoutNotes').value = workout.notes || '';

        // Übungen kopieren
        this.selectedExercises = workout.exercises.map(ex => ({
            ...ex,
            reps: [...ex.reps],
            weights: [...ex.weights]
        }));
        this.updateSelectedExercisesDisplay();

        App.showSection('newWorkout');
        Utils.showAlert('Training zum Duplizieren vorbereitet', 'info');
    },

    /**
     * Löscht den gecachten Zustand des Moduls.
     */
    clearCache() {
        this.workouts = [];
        this.selectedExercises = [];
        this.currentWorkout = null;
        this.isEditing = false;
        this.editingWorkoutId = null;
    }
};
