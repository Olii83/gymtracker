// Übungsmodul für Gym Tracker - Optimierte Version
// Dieses Modul verwaltet alle Übungen, einschließlich Erstellung, Bearbeitung, Löschung und Anzeige.

const Exercises = {
    // Zustandsvariablen für das Modul
    exercises: [],
    currentExercise: null,
    isEditing: false,
    editingExerciseId: null,
    
    // Vordefinierte Kategorien und Muskelgruppen
    categories: ['Krafttraining', 'Cardio', 'Stretching', 'Functional'],
    muscleGroups: ['Brust', 'Rücken', 'Schultern', 'Arme', 'Beine', 'Core', 'Cardio', 'Ganzkörper'],

    /**
     * Initialisiert das Übungsmodul.
     */
    init() {
        console.log('Exercises: Initialisiere Übungsmodul...');
        this.setupEventListeners();
        console.log('Exercises: Modul erfolgreich initialisiert');
    },

    /**
     * Richtet alle Event-Listener für das Modul ein.
     */
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            const newExerciseForm = document.getElementById('newExerciseForm');
            if (newExerciseForm) {
                newExerciseForm.addEventListener('submit', this.handleCreateExercise.bind(this));
            }
        });

        // Event-Delegation für dynamisch erstellte Buttons (Bearbeiten/Löschen)
        Utils.delegate(document.body, 'click', '.edit-exercise-btn', (event) => {
            const exerciseId = event.target.closest('button').dataset.id;
            this.startEdit(exerciseId);
        });

        Utils.delegate(document.body, 'click', '.delete-exercise-btn', (event) => {
            const exerciseId = event.target.closest('button').dataset.id;
            this.handleDeleteExercise(exerciseId);
        });
    },

    /**
     * Läd alle Übungen des Benutzers von der API.
     */
    async loadAll() {
        try {
            App.showLoading('exercisesList');
            const exercises = await Utils.apiCall('/exercises');
            this.exercises = exercises || [];
            this.displayExercises(this.exercises);
            App.hideLoading('exercisesList');
        } catch (error) {
            console.error('Exercises: Ladefehler:', error);
            Utils.showAlert('Fehler beim Laden der Übungen: ' + error.message, 'error');
            this.displayExercises([]);
            App.hideLoading('exercisesList');
        }
    },

    /**
     * Zeigt die Liste der Übungen an.
     * @param {Array<object>} exercises - Array der anzuzeigenden Übungen.
     */
    displayExercises(exercises) {
        const container = document.getElementById('exercisesList');
        if (!container) return;
        
        container.innerHTML = '';
        if (exercises.length === 0) {
            container.innerHTML = '<p class="text-center">Keine Übungen gefunden.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'table table-striped';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Kategorie</th>
                    <th>Muskelgruppe</th>
                    <th>Aktionen</th>
                </tr>
            </thead>
            <tbody>
                ${exercises.map(ex => `
                    <tr>
                        <td>${ex.name}</td>
                        <td>${ex.category}</td>
                        <td>${ex.muscle_group}</td>
                        <td>
                            <button class="btn btn-sm btn-info edit-exercise-btn" data-id="${ex.id}">Bearbeiten</button>
                            <button class="btn btn-sm btn-danger delete-exercise-btn" data-id="${ex.id}">Löschen</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        container.appendChild(table);
    },

    /**
     * Behandelt das Hinzufügen oder Bearbeiten einer Übung.
     * @param {Event} event - Das Formular-Submit-Event.
     */
    async handleCreateExercise(event) {
        event.preventDefault();
        
        const form = event.target;
        const exerciseData = {
            name: form.exerciseName.value,
            category: form.exerciseCategory.value,
            muscle_group: form.exerciseMuscleGroup.value,
            description: form.exerciseDescription.value,
        };

        if (this.isEditing) {
            await this.updateExercise(this.editingExerciseId, exerciseData);
        } else {
            await this.createExercise(exerciseData);
        }
    },
    
    /**
     * Erstellt eine neue Übung über die API.
     * @param {object} exerciseData - Die Daten der neuen Übung.
     */
    async createExercise(exerciseData) {
        try {
            await Utils.apiCall('/exercises', {
                method: 'POST',
                body: JSON.stringify(exerciseData)
            });
            
            Utils.showAlert('Übung erfolgreich erstellt!', 'success');
            Modals.closeModal('newExerciseModal');
            this.loadAll(); // Liste neu laden
        } catch (error) {
            console.error('Exercises: Erstellungsfehler:', error);
            Utils.showAlert('Fehler beim Erstellen der Übung: ' + error.message, 'error');
        }
    },
    
    /**
     * Aktualisiert eine bestehende Übung über die API.
     * @param {string} exerciseId - Die ID der zu aktualisierenden Übung.
     * @param {object} exerciseData - Die aktualisierten Daten.
     */
    async updateExercise(exerciseId, exerciseData) {
        try {
            await Utils.apiCall(`/exercises/${exerciseId}`, {
                method: 'PUT',
                body: JSON.stringify(exerciseData)
            });
            
            Utils.showAlert('Übung erfolgreich aktualisiert!', 'success');
            Modals.closeModal('newExerciseModal');
            this.loadAll();
            this.stopEdit(); // Bearbeitungsmodus beenden
        } catch (error) {
            console.error('Exercises: Update-Fehler:', error);
            Utils.showAlert('Fehler beim Aktualisieren der Übung: ' + error.message, 'error');
        }
    },

    /**
     * Löscht eine Übung.
     * @param {string} exerciseId - Die ID der zu löschenden Übung.
     */
    async handleDeleteExercise(exerciseId) {
        Modals.showConfirmationModal('Möchtest du diese Übung wirklich löschen?', async () => {
            try {
                await Utils.apiCall(`/exercises/${exerciseId}`, {
                    method: 'DELETE'
                });
                
                Utils.showAlert('Übung erfolgreich gelöscht!', 'success');
                this.loadAll(); // Liste neu laden
            } catch (error) {
                console.error('Exercises: Löschfehler:', error);
                Utils.showAlert('Fehler beim Löschen der Übung: ' + error.message, 'error');
            }
        });
    },

    /**
     * Startet den Bearbeitungsmodus für eine Übung.
     * @param {string} exerciseId - Die ID der zu bearbeitenden Übung.
     */
    startEdit(exerciseId) {
        const exercise = this.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) {
            Utils.showAlert('Übung nicht gefunden', 'error');
            return;
        }

        this.isEditing = true;
        this.editingExerciseId = exerciseId;
        this.currentExercise = exercise;
        this.populateForm(exercise);
        Modals.showModal('newExerciseModal');
        document.getElementById('newExerciseModalTitle').textContent = 'Übung bearbeiten';
    },

    /**
     * Beendet den Bearbeitungsmodus und setzt den Zustand zurück.
     */
    stopEdit() {
        this.isEditing = false;
        this.editingExerciseId = null;
        this.currentExercise = null;
        this.resetForm();
    },

    /**
     * Füllt das Übungs-Formular mit den Daten der zu bearbeitenden Übung.
     * @param {object} exercise - Das Übungs-Objekt.
     */
    populateForm(exercise) {
        const form = document.getElementById('newExerciseForm');
        if (form) {
            form.exerciseName.value = exercise.name;
            form.exerciseCategory.value = exercise.category;
            form.exerciseMuscleGroup.value = exercise.muscle_group;
            form.exerciseDescription.value = exercise.description || '';
            document.getElementById('newExerciseFormButton').textContent = 'Aktualisieren';
        }
    },
    
    /**
     * Setzt das Übungs-Formular auf den Anfangszustand zurück.
     */
    resetForm() {
        const form = document.getElementById('newExerciseForm');
        if (form) {
            form.reset();
            document.getElementById('newExerciseFormButton').textContent = 'Erstellen';
        }
        document.getElementById('newExerciseModalTitle').textContent = 'Neue Übung erstellen';
    },

    /**
     * Gibt eine Übung anhand ihrer ID zurück.
     * @param {string} exerciseId - Die ID der gesuchten Übung.
     * @returns {object|undefined} - Das Übungs-Objekt oder undefined.
     */
    getById(exerciseId) {
        return this.exercises.find(ex => ex.id === exerciseId);
    },

    /**
     * Gibt die Liste der Übungen zurück.
     * @returns {Array<object>} - Das Array aller Übungen.
     */
    getExercises() {
        return this.exercises;
    },

    /**
     * Löscht den gecachten Zustand des Moduls.
     */
    clearCache() {
        this.exercises = [];
        this.currentExercise = null;
        this.isEditing = false;
        this.editingExerciseId = null;
    }
};
