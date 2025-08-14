// Trainingsmodul für Gym Tracker - Überarbeitete Version
// Verwaltet die Erstellung, Anzeige und Bearbeitung von Trainingseinheiten.

const Workouts = {
    // Zustandsvariablen
    workouts: [],
    selectedExercises: [],
    currentWorkout: null,
    isEditing: false,
    editingWorkoutId: null,
    exerciseCatalog: [],

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
        // Use event delegation so handler is bound regardless of DOMContentLoaded timing
        Utils.delegate(document, 'submit', '#newWorkoutForm', this.handleCreateWorkout.bind(this));
        
        // Event-Delegation für dynamisch erstellte Buttons
        Utils.delegate(document.body, 'click', '.edit-workout-btn', (event) => {
            const workoutId = Number(event.target.closest('button').dataset.id);
            this.startEdit(workoutId);
        });

        Utils.delegate(document.body, 'click', '.delete-workout-btn', (event) => {
            const workoutId = Number(event.target.closest('button').dataset.id);
            this.handleDeleteWorkout(workoutId);
        });
        
        Utils.delegate(document.body, 'click', '.duplicate-workout-btn', (event) => {
            const workoutId = Number(event.target.closest('button').dataset.id);
            this.duplicateWorkout(workoutId);
        });
        
        Utils.delegate(document.body, 'click', '.add-exercise-btn', this.showExerciseSelectionModal.bind(this));

        // Editing controls for selected exercises
        Utils.delegate(document.body, 'input', '#selectedExercisesList .ex-sets-count', (event) => {
            const idx = Number(event.target.dataset.index);
            const val = parseInt(event.target.value, 10) || 0;
            this.updateExerciseField(idx, 'sets_count', val);
        });
        Utils.delegate(document.body, 'input', '#selectedExercisesList .ex-set-rep', (event) => {
            const idx = Number(event.target.dataset.index);
            const set = Number(event.target.dataset.set);
            this.setSetValue(idx, set, 'reps', event.target.value);
        });
        Utils.delegate(document.body, 'input', '#selectedExercisesList .ex-set-weight', (event) => {
            const idx = Number(event.target.dataset.index);
            const set = Number(event.target.dataset.set);
            this.setSetValue(idx, set, 'weights', event.target.value);
        });
        Utils.delegate(document.body, 'click', '#selectedExercisesList .ex-remove', (event) => {
            const idx = Number(event.target.dataset.index);
            this.removeExercise(idx);
        });
        Utils.delegate(document.body, 'click', '#selectedExercisesList .ex-move-up', (event) => {
            const idx = Number(event.target.dataset.index);
            this.moveExercise(idx, -1);
        });
        Utils.delegate(document.body, 'click', '#selectedExercisesList .ex-move-down', (event) => {
            const idx = Number(event.target.dataset.index);
            this.moveExercise(idx, 1);
        });
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

        let html = '';
        this.selectedExercises.forEach((ex, idx) => {
            const sets = Number(ex.sets_count) || 3;
            if (!Array.isArray(ex.reps)) ex.reps = Array.from({ length: sets }, () => '');
            if (!Array.isArray(ex.weights)) ex.weights = Array.from({ length: sets }, () => '');
            // Trim or pad arrays to match sets
            ex.reps = ex.reps.slice(0, sets).concat(Array(Math.max(0, sets - ex.reps.length)).fill(''));
            ex.weights = ex.weights.slice(0, sets).concat(Array(Math.max(0, sets - ex.weights.length)).fill(''));
            let rows = '';
            for (let s = 0; s < sets; s++) {
                rows += `
                    <div class="form-row" style="gap:8px;align-items:center;">
                        <div class="form-group" style="flex:0 0 80px;">
                            <label>Satz ${s + 1}</label>
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Wdh.</label>
                            <input type="number" class="ex-set-rep" data-index="${idx}" data-set="${s}" min="0" value="${ex.reps[s] || ''}" />
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Gewicht</label>
                            <input type="number" class="ex-set-weight" data-index="${idx}" data-set="${s}" step="0.01" min="0" value="${ex.weights[s] || ''}" />
                        </div>
                    </div>`;
            }
            html += `
                <div class="selected-exercise-card" data-index="${idx}">
                    <div class="exercise-header" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                        <h4 style="margin:0;">${ex.name || ex.exercise_name}</h4>
                        <div class="exercise-controls" style="display:flex;gap:6px;">
                            <button class="btn btn-sm btn-secondary ex-move-up" data-index="${idx}">▲</button>
                            <button class="btn btn-sm btn-secondary ex-move-down" data-index="${idx}">▼</button>
                            <button class="btn btn-sm btn-danger ex-remove" data-index="${idx}">Entfernen</button>
                        </div>
                    </div>
                    <p><strong>Muskelgruppe:</strong> ${ex.muscle_group}</p>
                    <div class="form-row sets-input">
                        <div class="form-group">
                            <label>Sätze</label>
                            <input type="number" class="ex-sets-count" data-index="${idx}" min="1" value="${sets}" />
                        </div>
                    </div>
                    <div class="card" style="margin-top:8px;">
                        ${rows}
                    </div>
                </div>`;
        });
        container.innerHTML = html;
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
     * Öffnet den Auswahldialog für Übungen und ermöglicht das Hinzufügen zur Auswahl.
     */
    async showExerciseSelectionModal() {
        try {
            // Modal dynamisch erstellen, falls nicht vorhanden
            if (!document.getElementById('exerciseSelectionModal')) {
                const modalHTML = `
                    <div id="exerciseSelectionModal" class="modal">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h3 class="modal-title">Übungen auswählen</h3>
                                <button class="close" onclick="Modals.closeModal('exerciseSelectionModal')">&times;</button>
                            </div>
                            <div class="modal-body">
                                <div class="form-group">
                                    <label for="exerciseSelectionSearch">Suche</label>
                                    <input type="text" id="exerciseSelectionSearch" placeholder="Name oder Muskelgruppe..." />
                                </div>
                                <div id="exerciseSelectionList" class="table-container"></div>
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-secondary" onclick="Modals.closeModal('exerciseSelectionModal')">Abbrechen</button>
                                <button class="btn btn-primary" id="exerciseSelectionAddButton">Hinzufügen</button>
                            </div>
                        </div>
                    </div>`;
                document.body.insertAdjacentHTML('beforeend', modalHTML);
            }

            // Übungen laden (einmalig cachen)
            if (!Array.isArray(this.exerciseCatalog) || this.exerciseCatalog.length === 0) {
                const exercises = await Utils.apiCall('/exercises');
                this.exerciseCatalog = Array.isArray(exercises) ? exercises : [];
            }

            // Liste initial rendern
            this.renderExerciseSelectionList('');
            Modals.showModal('exerciseSelectionModal');

            // Events nur einmal binden
            const searchInput = document.getElementById('exerciseSelectionSearch');
            if (searchInput && !searchInput._gt_bound) {
                searchInput.addEventListener('input', (e) => this.filterExerciseSelection(e.target.value));
                searchInput._gt_bound = true;
            }

            const addButton = document.getElementById('exerciseSelectionAddButton');
            if (addButton && !addButton._gt_bound) {
                addButton.addEventListener('click', () => this.applySelectedExercises());
                addButton._gt_bound = true;
            }
        } catch (error) {
            console.error('Workouts: Fehler beim Öffnen der Übungsauswahl:', error);
            Utils.showAlert('Fehler beim Laden der Übungsliste: ' + error.message, 'error');
        }
    },

    /**
     * Rendert die Übungsliste im Auswahl-Modal mit optionalem Filter.
     * @param {string} term - Suchbegriff
     */
    renderExerciseSelectionList(term = '') {
        const container = document.getElementById('exerciseSelectionList');
        if (!container) return;

        const filter = (term || '').toLowerCase();
        const items = this.exerciseCatalog.filter(ex => {
            const hay = `${ex.name} ${ex.muscle_group} ${ex.category}`.toLowerCase();
            return hay.includes(filter);
        });

        if (items.length === 0) {
            container.innerHTML = '<p class="text-center">Keine Übungen gefunden.</p>';
            return;
        }

        const html = items.map(ex => {
            const checked = this.selectedExercises.some(se => se.id === ex.id) ? 'checked' : '';
            return `
                <div class="sets-input">
                    <label>
                        <input type="checkbox" class="exercise-select" data-id="${ex.id}" ${checked} />
                        ${ex.name} <span class="text-muted">(${ex.muscle_group})</span>
                    </label>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    /**
     * Filtert die angezeigte Übungsliste.
     * @param {string} term
     */
    filterExerciseSelection(term) {
        this.renderExerciseSelectionList(term);
    },

    /**
     * Übernimmt die ausgewählten Übungen in die aktuelle Auswahl.
     */
    applySelectedExercises() {
        const container = document.getElementById('exerciseSelectionList');
        if (!container) return;

        const checkboxes = container.querySelectorAll('.exercise-select:checked');
        const added = [];
        checkboxes.forEach(cb => {
            const id = Number(cb.getAttribute('data-id'));
            if (!this.selectedExercises.some(se => (se.id || se.exercise_id) === id)) {
                const ex = this.exerciseCatalog.find(e => e.id === id);
                if (ex) {
                    this.selectedExercises.push({
                        id: ex.id,
                        name: ex.name,
                        muscle_group: ex.muscle_group,
                        sets_count: 3,
                        reps: [],
                        weights: []
                    });
                    added.push(ex.name);
                }
            }
        });

        this.updateSelectedExercisesDisplay();

        // Falls Templates-Ansicht eine Auswahlanzeige hat, aktualisieren
        const templateContainer = document.getElementById('templateSelectedExercisesList');
        if (templateContainer) {
            templateContainer.innerHTML = this.selectedExercises.length
                ? this.selectedExercises.map(ex => `
                    <div class="selected-exercise-card">
                        <h4>${ex.name || ex.exercise_name}</h4>
                        <p><strong>Muskelgruppe:</strong> ${ex.muscle_group}</p>
                    </div>
                `).join('')
                : '<p class="text-center">Keine Übungen ausgewählt.</p>';
        }

        Modals.closeModal('exerciseSelectionModal');
        if (added.length) {
            Utils.showAlert(`${added.length} Übung(en) hinzugefügt`, 'success');
        } else {
            Utils.showAlert('Keine neuen Übungen ausgewählt', 'info');
        }
    },

    /**
     * Aktualisiert ein Feld einer ausgewählten Übung und rendert neu.
     */
    updateExerciseField(index, field, value) {
        if (index < 0 || index >= this.selectedExercises.length) return;
        this.selectedExercises[index][field] = value;
        if (field === 'sets_count') this.ensureSetsSize(index);
        this.updateSelectedExercisesDisplay();
    },

    /**
     * Entfernt eine Übung aus der Auswahl.
     */
    removeExercise(index) {
        if (index < 0 || index >= this.selectedExercises.length) return;
        this.selectedExercises.splice(index, 1);
        this.updateSelectedExercisesDisplay();
    },

    /**
     * Verschiebt eine Übung innerhalb der Auswahl.
     */
    moveExercise(index, delta) {
        const newIndex = index + delta;
        if (newIndex < 0 || newIndex >= this.selectedExercises.length) return;
        const tmp = this.selectedExercises[index];
        this.selectedExercises[index] = this.selectedExercises[newIndex];
        this.selectedExercises[newIndex] = tmp;
        this.updateSelectedExercisesDisplay();
    },

    /**
     * Parst eine CSV-Zeichenkette in ein Array, entfernt Leerzeichen und leere Einträge.
     */
    parseCSV(text) {
        if (!text) return [];
        return text.split(',').map(s => s.trim()).filter(Boolean);
    },

    /**
     * Stellt sicher, dass reps/weights Arrays die Länge von sets_count haben
     */
    ensureSetsSize(index) {
        const ex = this.selectedExercises[index];
        const sets = Number(ex.sets_count) || 0;
        if (!Array.isArray(ex.reps)) ex.reps = [];
        if (!Array.isArray(ex.weights)) ex.weights = [];
        ex.reps = ex.reps.slice(0, sets).concat(Array(Math.max(0, sets - ex.reps.length)).fill(''));
        ex.weights = ex.weights.slice(0, sets).concat(Array(Math.max(0, sets - ex.weights.length)).fill(''));
    },

    /**
     * Setzt den Wert eines Satzes (rep/weight)
     */
    setSetValue(index, setIndex, type, value) {
        const ex = this.selectedExercises[index];
        if (!ex) return;
        const sets = Number(ex.sets_count) || 0;
        if (!Array.isArray(ex[type])) ex[type] = [];
        while (ex[type].length < sets) ex[type].push('');
        if (setIndex >= 0 && setIndex < sets) {
            ex[type][setIndex] = value;
        }
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
