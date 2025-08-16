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
    lastPerfCache: new Map(),

    /**
     * Initialisiert das Trainingsmodul.
     */
    init() {
        console.log('Workouts: Modul initialisiert');
        this.setupEventListeners();
        this.ensureUIButtons();
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
        Utils.delegate(document.body, 'click', '#loadTemplateBtn', this.showTemplateSelectionModal.bind(this));
        Utils.delegate(document.body, 'click', '#saveTemplateBtn', this.saveCurrentAsTemplate.bind(this));

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
        // Ensure all selected exercises exist; optionally create missing ones
        const ok = await this.ensureExercisesExist();
        if (!ok) {
            Utils.showAlert('Erstellung abgebrochen.', 'info');
            return;
        }
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
        // Ensure all selected exercises exist; optionally create missing ones
        const ok = await this.ensureExercisesExist();
        if (!ok) {
            Utils.showAlert('Aktualisierung abgebrochen.', 'info');
            return;
        }
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
    async startEdit(workoutId) {
        try {
            const workout = await Utils.apiCall(`/workouts/${workoutId}`);
            if (!workout) {
                Utils.showAlert('Training nicht gefunden', 'error');
                return;
            }
            this.isEditing = true;
            this.editingWorkoutId = workoutId;
            this.currentWorkout = workout;
            this.populateForm(workout);
            App.showSection('newWorkout');
            const btn = document.getElementById('newWorkoutFormButton');
            if (btn) btn.textContent = 'Aktualisieren';
        } catch (e) {
            console.error('Workouts: Fehler beim Laden des Workouts:', e);
            Utils.showAlert('Fehler beim Laden des Workouts: ' + e.message, 'error');
        }
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
                    <div class="last-performance" id="lastPerf-${idx}" style="margin-top:8px;color: var(--text-secondary); font-size: var(--font-size-sm);"></div>
                </div>`;
        });
        container.innerHTML = html;
        this.selectedExercises.forEach((ex, idx) => {
            const exId = ex.id || ex.exercise_id;
            if (exId) this.populateLastPerformance(idx, Number(exId));
        });
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
    async duplicateWorkout(workoutId) {
        try {
            const workout = await Utils.apiCall(`/workouts/${workoutId}`);
            if (!workout) {
                Utils.showAlert('Training nicht gefunden', 'error');
                return;
            }
            this.isEditing = false;
            this.editingWorkoutId = null;
            const nameEl = document.getElementById('workoutName');
            const dateEl = document.getElementById('workoutDate');
            const notesEl = document.getElementById('workoutNotes');
            if (nameEl) nameEl.value = (workout.name || 'Workout') + ' (Kopie)';
            if (dateEl) dateEl.value = Utils.getCurrentDate();
            if (notesEl) notesEl.value = workout.notes || '';

            this.selectedExercises = Array.isArray(workout.exercises) ? workout.exercises.map(ex => ({
                id: ex.exercise_id || ex.id,
                exercise_id: ex.exercise_id || ex.id,
                exercise_name: ex.exercise_name || ex.name,
                name: ex.exercise_name || ex.name,
                muscle_group: ex.muscle_group,
                sets_count: ex.sets_count,
                reps: Array.isArray(ex.reps) ? [...ex.reps] : [],
                weights: Array.isArray(ex.weights) ? [...ex.weights] : [],
                notes: ''
            })) : [];
            this.updateSelectedExercisesDisplay();
            App.showSection('newWorkout');
            Utils.showAlert('Training zum Duplizieren vorbereitet', 'info');
        } catch (e) {
            console.error('Workouts: Fehler beim Duplizieren:', e);
            Utils.showAlert('Fehler beim Duplizieren: ' + e.message, 'error');
        }
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
            const checked = this.selectedExercises.some(se => (se.id || se.exercise_id) === ex.id) ? 'checked' : '';
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
        const exId = ex.id || ex.exercise_id;
        if (type === 'weights' && exId) {
            this.populateLastPerformance(index, Number(exId));
        }
    },

    /**
     * Löscht den gecachten Zustand des Moduls.
     */
    /**
     * Stellt sicher, dass alle ausgewählten Übungen in der Datenbank existieren.
     * Falls nicht, fragt nach Bestätigung und erstellt sie automatisch.
     * @returns {Promise<boolean>} - true, wenn weitergemacht werden soll.
     */
    async ensureExercisesExist() {
        try {
            const list = await Utils.apiCall('/exercises');
            const existingById = new Map(list.map(e => [e.id, e]));
            const existingByKey = new Map(list.map(e => [`${(e.name||'').toLowerCase()}|${(e.muscle_group||'').toLowerCase()}`, e]));

            const missing = [];
            for (const ex of this.selectedExercises) {
                let exId = ex.id || ex.exercise_id;
                let ok = exId && existingById.has(Number(exId));
                if (!ok) {
                    // Try by name + muscle group
                    const key = `${(ex.name || ex.exercise_name || '').toLowerCase()}|${(ex.muscle_group||'').toLowerCase()}`;
                    const found = existingByKey.get(key);
                    if (found) {
                        ex.id = found.id;
                        ok = true;
                    }
                }
                if (!ok) missing.push(ex);
            }

            if (missing.length === 0) return true;

            const names = missing.map(ex => ex.name || ex.exercise_name || 'Unbenannt').join(', ');
            const confirmCreate = window.confirm(`${missing.length} Übung(en) existieren nicht: ${names}. Jetzt automatisch erstellen?`);
            if (!confirmCreate) return false;

            for (const ex of missing) {
                const payload = {
                    name: ex.name || ex.exercise_name || 'Unbenannt',
                    category: ex.category || 'Krafttraining',
                    muscle_group: ex.muscle_group || 'Ganzkörper',
                    description: ex.description || ''
                };
                try {
                    const created = await Utils.apiCall('/exercises', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                    ex.id = created.id;
                } catch (err) {
                    console.error('Auto-Create Übung fehlgeschlagen:', err);
                    Utils.showAlert(`Übung konnte nicht erstellt werden: ${payload.name}`, 'error');
                    return false;
                }
            }
            return true;
        } catch (error) {
            console.error('ensureExercisesExist Fehler:', error);
            return false;
        }
    },

    clearCache() {
        this.workouts = [];
        this.selectedExercises = [];
        this.currentWorkout = null;
        this.isEditing = false;
        this.editingWorkoutId = null;
    },

    /**
     * Stellt sicher, dass die Buttons für Vorlagen im UI vorhanden sind.
     */
    ensureUIButtons() {
        const form = document.getElementById('newWorkoutForm');
        if (!form) return;
        const actions = form.querySelector('.form-actions');
        if (!actions) return;
        if (!document.getElementById('loadTemplateBtn')) {
            const loadBtn = document.createElement('button');
            loadBtn.id = 'loadTemplateBtn';
            loadBtn.type = 'button';
            loadBtn.className = 'btn btn-secondary';
            loadBtn.textContent = 'Vorlage laden';
            actions.insertBefore(loadBtn, actions.firstChild);
        }
        if (!document.getElementById('saveTemplateBtn')) {
            const saveBtn = document.createElement('button');
            saveBtn.id = 'saveTemplateBtn';
            saveBtn.type = 'button';
            saveBtn.className = 'btn btn-info';
            saveBtn.textContent = 'Als Vorlage speichern';
            actions.appendChild(saveBtn);
        }
    },

    /**
     * Zeigt das Vorlagen-Auswahlmodal, lädt Vorlagen und ermöglicht Anwenden (Anhängen/Ersetzen).
     */
    async showTemplateSelectionModal() {
        try {
            if (!document.getElementById('templateSelectionModal')) {
                const modalHTML = `
                    <div id="templateSelectionModal" class="modal">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h3 class="modal-title">Vorlage auswählen</h3>
                                <button class="close" onclick="Modals.closeModal('templateSelectionModal')">&times;</button>
                            </div>
                            <div class="modal-body">
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="templateAppendMode" checked /> Vorhandene Übungen beibehalten (hinzufügen)
                                    </label>
                                </div>
                                <div id="templateSelectionList"></div>
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-secondary" onclick="Modals.closeModal('templateSelectionModal')">Schließen</button>
                            </div>
                        </div>
                    </div>`;
                document.body.insertAdjacentHTML('beforeend', modalHTML);
            }

            const [templates, exercises] = await Promise.all([
                Utils.apiCall('/templates'),
                Utils.apiCall('/exercises')
            ]);
            const exMap = new Map(exercises.map(e => [e.id, e]));
            const list = document.getElementById('templateSelectionList');
            if (!list) return;
            if (!templates || templates.length === 0) {
                list.innerHTML = '<p class="text-center">Keine Vorlagen vorhanden.</p>';
            } else {
                list.innerHTML = templates.map(t => {
                    const exCount = (t.exercises || []).length;
                    return `
                        <div class="card" style="margin-bottom:8px;">
                            <div class="card-title">${t.name}</div>
                            <div class="form-actions">
                                <button class="btn btn-primary tpl-apply" data-id="${t.id}">Anwenden</button>
                            </div>
                            <div class="template-preview">${exCount} Übung(en)</div>
                        </div>`;
                }).join('');
            }

            // Bind apply buttons (replace old listeners)
            list.querySelectorAll('.tpl-apply').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = Number(btn.dataset.id);
                    const append = document.getElementById('templateAppendMode').checked;
                    this.applyTemplateFromId(id, append, templates, exMap);
                }, { once: true });
            });

            Modals.showModal('templateSelectionModal');
        } catch (error) {
            console.error('Vorlagen laden fehlgeschlagen:', error);
            Utils.showAlert('Fehler beim Laden der Vorlagen: ' + error.message, 'error');
        }
    },

    /**
     * Wendet eine Vorlage an (entweder anhängen oder ersetzen), mit Join auf Übungsdetails.
     */
    applyTemplateFromId(templateId, append, templates, exMap) {
        const tpl = (templates || []).find(t => t.id === templateId);
        if (!tpl) return;
        const built = (tpl.exercises || []).map(ex => {
            const base = exMap.get(ex.exercise_id) || {};
            let reps = [];
            let weights = [];
            try { reps = ex.suggested_reps ? JSON.parse(ex.suggested_reps) : []; } catch(e) { reps = []; }
            try { weights = ex.suggested_weight ? JSON.parse(ex.suggested_weight) : []; } catch(e) { weights = []; }
            return {
                id: ex.exercise_id,
                name: base.name || 'Übung',
                muscle_group: base.muscle_group || 'Ganzkörper',
                sets_count: ex.suggested_sets || reps.length || 3,
                reps,
                weights,
                notes: ''
            };
        });
        if (append) {
            // Merge, avoid duplicates by id
            const existingIds = new Set(this.selectedExercises.map(e => e.id || e.exercise_id));
            const merged = this.selectedExercises.concat(built.filter(b => !existingIds.has(b.id)));
            this.selectedExercises = merged;
        } else {
            this.selectedExercises = built;
        }
        this.updateSelectedExercisesDisplay();
        Modals.closeModal('templateSelectionModal');
        Utils.showAlert('Vorlage angewendet', 'success');
    },

    /**
     * Speichert die aktuelle Auswahl als Vorlage (schnell aus dem Workout-Editor).
     */
    async saveCurrentAsTemplate() {
        const name = prompt('Name der Vorlage:');
        if (!name) return;
        const payload = {
            name: name.trim(),
            description: `Erstellt aus Workout: ${document.getElementById('workoutName')?.value || 'Unbenannt'}`,
            exercises: this.selectedExercises.map((ex, idx) => ({
                exercise_id: ex.id || ex.exercise_id,
                exercise_order: idx + 1,
                suggested_sets: ex.sets_count || 3,
                suggested_reps: ex.reps || [],
                suggested_weight: ex.weights || []
            }))
        };
        try {
            await Utils.apiCall('/templates', { method: 'POST', body: JSON.stringify(payload) });
            Utils.showAlert('Vorlage gespeichert', 'success');
        } catch (err) {
            console.error('Vorlage speichern fehlgeschlagen:', err);
            Utils.showAlert('Fehler beim Speichern der Vorlage: ' + err.message, 'error');
        }
    },

    // --- Last performance helpers ---
    computeMaxWeight(ex) {
        const arr = Array.isArray(ex && ex.weights) ? ex.weights.map(Number).filter(n => !isNaN(n) && n > 0) : [];
        return arr.length ? Math.max(...arr) : null;
    },

    computeMaxFromRow(row) {
        let ws = row && row.weights;
        if (typeof ws === 'string') {
            try { ws = JSON.parse(ws); } catch (_) { ws = []; }
        }
        const nums = Array.isArray(ws) ? ws.map(Number).filter(n => !isNaN(n) && n > 0) : [];
        return nums.length ? Math.max(...nums) : null;
    },

    async getLastPerformance(exerciseId) {
        if (this.lastPerfCache.has(exerciseId)) return this.lastPerfCache.get(exerciseId);
        try {
            const data = await Utils.apiCall(`/exercises/${exerciseId}/last`);
            this.lastPerfCache.set(exerciseId, data || null);
            return data || null;
        } catch (err) {
            console.error('Fehler beim Laden der letzten Leistung:', err);
            this.lastPerfCache.set(exerciseId, null);
            return null;
        }
    },

    async populateLastPerformance(index, exerciseId) {
        const el = document.getElementById(`lastPerf-${index}`);
        if (!el) return;
        el.textContent = '';
        const last = await this.getLastPerformance(exerciseId);
        if (!last) { el.textContent = ''; return; }
        const lastMax = this.computeMaxFromRow(last);
        const dateStr = Utils.formatDate(last.workout_date);
        if (lastMax == null) { el.textContent = ''; return; }
        let text = `Letztes Mal (${dateStr}): Max ${lastMax} kg`;
        const current = this.selectedExercises[index];
        const currMax = this.computeMaxWeight(current);
        if (currMax != null) {
            let cmp = '=';
            if (currMax > lastMax) cmp = '↑';
            else if (currMax < lastMax) cmp = '↓';
            text += ` — Vergleich: ${cmp}`;
        }
        el.textContent = text;
    }
};
