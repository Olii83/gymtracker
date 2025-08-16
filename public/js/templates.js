// Templates-Modul für Gym Tracker - Überarbeitete Version
// Verwaltet die Erstellung, Verwaltung und Anwendung von Workout-Vorlagen.

const Templates = {
    // Zustandsvariablen
    templates: [],
    
    /**
     * Initialisiert das Templates-Modul.
     */
    init() {
        console.log('Templates: Modul initialisiert');
        this.setupEventListeners();
    },

    /**
     * Richtet Event-Listener für das Modul ein.
     */
    setupEventListeners() {
        const newTemplateForm = document.getElementById('newTemplateForm');
        if (newTemplateForm) {
            newTemplateForm.addEventListener('submit', this.handleCreateTemplate.bind(this));
        }
        // Button zum Auswählen von Übungen im Vorlagen-Modal
        const selectBtn = document.getElementById('selectExercisesForTemplate');
        if (selectBtn && !selectBtn._gt_bound) {
            selectBtn.addEventListener('click', () => {
                if (typeof Workouts !== 'undefined' && Workouts.showExerciseSelectionModal) {
                    Workouts.showExerciseSelectionModal().then(() => this.renderSelectionPreview());
                }
            });
            selectBtn._gt_bound = true;
        }

        // Event-Delegation für dynamisch erstellte Buttons (Anwenden/Löschen)
        Utils.delegate(document.body, 'click', '.apply-template-btn', (event) => {
            const templateId = Number(event.target.closest('button').dataset.id);
            this.applyTemplate(templateId);
        });

        Utils.delegate(document.body, 'click', '.delete-template-btn', (event) => {
            const templateId = Number(event.target.closest('button').dataset.id);
            this.handleDeleteTemplate(templateId);
        });
    },
    
    /**
     * Rendert eine Vorschau der aktuell im Workout ausgewählten Übungen
     * innerhalb des Vorlage-Erstellen Modals.
     */
    renderSelectionPreview() {
        const container = document.getElementById('templateSelectedExercisesList');
        if (!container) return;

        const selected = (typeof Workouts !== 'undefined' && Array.isArray(Workouts.selectedExercises))
            ? Workouts.selectedExercises
            : [];

        if (!selected.length) {
            container.innerHTML = '<p class="text-center">Keine Übungen ausgewählt. Füge Übungen in "Neues Training" hinzu.</p>';
            return;
        }

        container.innerHTML = selected.map(ex => `
            <div class="selected-exercise-card">
                <h4>${ex.name || ex.exercise_name}</h4>
                <p><strong>Muskelgruppe:</strong> ${ex.muscle_group}</p>
                ${ex.sets_count ? `<p><strong>Sätze:</strong> ${ex.sets_count}</p>` : ''}
                ${ex.reps && ex.reps.length ? `<p><strong>Wdh.:</strong> ${ex.reps.join(', ')}</p>` : ''}
                ${ex.weights && ex.weights.length ? `<p><strong>Gewichte:</strong> ${ex.weights.join(', ')}</p>` : ''}
            </div>
        `).join('');
    },

    /**
     * Läd alle Vorlagen des Benutzers von der API.
     */
    async loadAll() {
        try {
            App.showLoading('templatesList');
            const templates = await Utils.apiCall('/templates');
            this.templates = templates || [];
            this.displayTemplates(this.templates);
            App.hideLoading('templatesList');
        } catch (error) {
            console.error('Templates: Ladefehler:', error);
            Utils.showAlert('Fehler beim Laden der Vorlagen: ' + error.message, 'error');
            this.displayTemplates([]);
            App.hideLoading('templatesList');
        }
    },
    
    /**
     * Zeigt die Liste der Vorlagen an.
     * @param {Array<object>} templates - Array der anzuzeigenden Vorlagen.
     */
    displayTemplates(templates) {
        const container = document.getElementById('templatesList');
        if (!container) return;
        
        container.innerHTML = '';
        if (templates.length === 0) {
            container.innerHTML = '<p class="text-center">Keine Vorlagen gefunden.</p>';
            return;
        }

        const listHTML = templates.map(t => `
            <div class="template-card">
                <h3>${t.name}</h3>
                <p>${t.description || 'Keine Beschreibung'}</p>
                <div class="template-actions">
                    <button class="btn btn-sm btn-primary apply-template-btn" data-id="${t.id}">Anwenden</button>
                    <button class="btn btn-sm btn-danger delete-template-btn" data-id="${t.id}">Löschen</button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = listHTML;
    },
    
    /**
     * Behandelt das Erstellen einer neuen Vorlage.
     * @param {Event} event - Das Formular-Submit-Event.
     */
    async handleCreateTemplate(event) {
        event.preventDefault();
        
        const form = event.target;
        const templateData = {
            name: form.templateName.value,
            description: form.templateDescription.value,
            exercises: Workouts.selectedExercises.map(ex => ({
                exercise_id: ex.id || ex.exercise_id, // Verwendet die korrekte ID
                name: ex.name || ex.exercise_name,
                muscle_group: ex.muscle_group,
                suggested_sets: ex.sets_count,
                suggested_reps: ex.reps,
                suggested_weight: ex.weights
            }))
        };

        try {
            // Sicherstellen, dass alle Übungen existieren, um FK-Fehler zu vermeiden
            if (typeof Workouts !== 'undefined' && Workouts.ensureExercisesExist) {
                const ok = await Workouts.ensureExercisesExist();
                if (!ok) return;
            }

            await Utils.apiCall('/templates', {
                method: 'POST',
                body: JSON.stringify(templateData)
            });
            
            Utils.showAlert('Vorlage erfolgreich erstellt!', 'success');
            Modals.closeModal('newTemplateModal');
            this.loadAll();
        } catch (error) {
            console.error('Templates: Erstellungsfehler:', error);
            Utils.showAlert('Fehler beim Erstellen der Vorlage: ' + error.message, 'error');
        }
    },
    
    /**
     * Speichert das aktuelle Workout als Vorlage.
     * @param {string} templateName - Der Name der Vorlage.
     */
    async saveCurrentWorkoutAsTemplate(templateName) {
        if (!templateName) {
            Utils.showAlert('Bitte gib einen Namen für die Vorlage an.', 'error');
            return;
        }
        
        const templateData = {
            name: templateName.trim(),
            description: `Erstellt aus Workout: ${document.getElementById('workoutName')?.value || 'Unbenannt'}`,
            exercises: Workouts.selectedExercises.map(ex => ({
                exercise_id: ex.id,
                name: ex.name,
                muscle_group: ex.muscle_group,
                suggested_sets: ex.sets_count,
                suggested_reps: [...ex.reps],
                suggested_weight: [...ex.weights]
            }))
        };
        
        try {
            await Utils.apiCall('/templates', {
                method: 'POST',
                body: JSON.stringify(templateData)
            });
            
            Utils.showAlert('Workout als Vorlage gespeichert!', 'success');
            this.loadAll();
        } catch (error) {
            console.error('Templates: Fehler beim Speichern als Vorlage:', error);
            Utils.showAlert('Fehler beim Speichern der Vorlage: ' + error.message, 'error');
        }
    },
    
    /**
     * Wendet eine Vorlage auf ein neues Workout an.
     * @param {string} templateId - Die ID der anzuwendenden Vorlage.
     */
    applyTemplate(templateId) {
        const template = this.getById(templateId);
        if (!template) {
            Utils.showAlert('Vorlage nicht gefunden', 'error');
            return;
        }
        
        // Setze das neue Workout-Formular mit den Vorlagendaten
        Workouts.clearWorkoutForm();
        Workouts.isEditing = false;
        Workouts.editingWorkoutId = null;
        
        document.getElementById('workoutName').value = `Workout basierend auf "${template.name}"`;
        document.getElementById('workoutDate').value = Utils.getCurrentDate();
        
        // Übertrage die Übungen
        Workouts.selectedExercises = template.exercises.map(ex => ({
            exercise_id: ex.exercise_id,
            exercise_name: ex.name,
            muscle_group: ex.muscle_group,
            sets_count: ex.suggested_sets,
            reps: ex.suggested_reps,
            weights: ex.suggested_weight,
            notes: ''
        }));
        
        Workouts.updateSelectedExercisesDisplay();
        
        App.showSection('newWorkout');
        Utils.showAlert('Vorlage erfolgreich angewendet', 'success');
    },

    /**
     * Löscht eine Vorlage.
     * @param {string} templateId - Die ID der zu löschenden Vorlage.
     */
    async handleDeleteTemplate(templateId) {
        Modals.showConfirmationModal('Möchtest du diese Vorlage wirklich löschen?', async () => {
            try {
                await Utils.apiCall(`/templates/${templateId}`, {
                    method: 'DELETE'
                });
                
                Utils.showAlert('Vorlage erfolgreich gelöscht!', 'success');
                this.loadAll();
            } catch (error) {
                console.error('Templates: Löschfehler:', error);
                Utils.showAlert('Fehler beim Löschen der Vorlage: ' + error.message, 'error');
            }
        });
    },

    /**
     * Gibt eine Vorlage anhand ihrer ID zurück.
     * @param {string} templateId - Die ID der gesuchten Vorlage.
     * @returns {object|undefined} - Das Vorlagen-Objekt oder undefined.
     */
    getById(templateId) {
        return this.templates.find(t => t.id === templateId);
    },

    /**
     * Löscht den gecachten Zustand des Moduls.
     */
    clearCache() {
        this.templates = [];
    }
};
