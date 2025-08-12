// Templates module for Gym Tracker - FIXED VERSION

const Templates = {
    // State
    templates: [],
    selectedExercises: [],
    currentTemplate: null,

    // Initialize templates module
    init() {
        console.log('Templates module initialized');
        this.setupEventListeners();
        this.createModals();
    },

    // Setup event listeners
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            const newTemplateForm = document.getElementById('newTemplateForm');
            if (newTemplateForm) {
                newTemplateForm.addEventListener('submit', this.handleCreateTemplate.bind(this));
            }
        });
    },

    // Create template modals
    createModals() {
        const modalHTML = `
            <!-- Modal: New Workout Template -->
            <div id="newTemplateModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">📋 Neue Workout-Vorlage erstellen</h2>
                        <button class="close" onclick="Templates.closeNewModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="newTemplateForm">
                            <div class="form-group">
                                <label for="templateName">Name der Vorlage *</label>
                                <input type="text" id="templateName" name="templateName" required placeholder="z.B. GK Push, Oberkörper, Beine">
                            </div>
                            
                            <div class="form-row">
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
                            </div>
                            
                            <div class="form-group">
                                <label for="templateDescription">Beschreibung</label>
                                <textarea id="templateDescription" name="templateDescription" placeholder="Beschreibung der Vorlage..."></textarea>
                            </div>
                            
                            <div class="exercise-selector">
                                <h4 class="form-section-title">💪 Übungen zur Vorlage hinzufügen</h4>
                                
                                <div class="selector-row">
                                    <div class="form-group">
                                        <label for="templateExerciseSelect">Übung auswählen</label>
                                        <select id="templateExerciseSelect">
                                            <option value="">-- Übung auswählen --</option>
                                        </select>
                                    </div>
                                    
                                    <button type="button" class="btn btn-primary" onclick="Templates.addExercise()">Hinzufügen</button>
                                </div>
                                
                                <!-- Schnell neue Übung für Template erstellen -->
                                <div class="quick-exercise-add">
                                    <h4 class="quick-add-title">🚀 Neue Übung für Vorlage erstellen</h4>
                                    <div class="quick-add-grid">
                                        <div class="form-group">
                                            <label for="templateQuickExerciseName">Name der Übung</label>
                                            <input type="text" id="templateQuickExerciseName" placeholder="z.B. Bankdrücken">
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="templateQuickExerciseCategory">Kategorie</label>
                                            <select id="templateQuickExerciseCategory">
                                                <option value="">Wählen...</option>
                                                <option value="Krafttraining">Krafttraining</option>
                                                <option value="Cardio">Cardio</option>
                                                <option value="Stretching">Stretching</option>
                                                <option value="Functional">Functional</option>
                                            </select>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label for="templateQuickExerciseMuscle">Muskelgruppe</label>
                                            <select id="templateQuickExerciseMuscle">
                                                <option value="">Wählen...</option>
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
                                        
                                        <button type="button" class="btn btn-success" onclick="Templates.quickAddExercise()">Erstellen & Hinzufügen</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div id="templateSelectedExercises">
                                <!-- Selected exercises for template will be displayed here -->
                            </div>
                            
                            <div style="text-align: center; margin-top: 20px;">
                                <button type="submit" class="btn btn-success">📋 Vorlage speichern</button>
                                <button type="button" class="btn btn-outline" onclick="Templates.closeNewModal()">❌ Abbrechen</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Add modals to page
        let container = document.getElementById('modals-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modals-container';
            document.body.appendChild(container);
        }
        container.innerHTML += modalHTML;
    },

    // Load all templates
    async loadAll() {
        try {
            const templates = await Utils.apiCall('/templates');
            this.templates = templates || [];
            this.displayTemplatesList(this.templates);
            this.updateTemplateSelect();
        } catch (error) {
            console.error('Templates load error:', error);
            Utils.showAlert('Fehler beim Laden der Vorlagen: ' + error.message, 'error');
            this.displayTemplatesList([]);
        }
    },

    // Display templates list
    displayTemplatesList(templates) {
        const container = document.getElementById('templatesList');
        if (!container) return;
        
        if (templates.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #666; padding: 40px;">
                    <p>📋 Noch keine Workout-Vorlagen vorhanden</p>
                    <p style="margin-top: 10px;">
                        <button class="btn btn-success" onclick="Templates.showNewModal()">
                            ➕ Erste Vorlage erstellen
                        </button>
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = templates.map(template => `
            <div class="card" style="margin-bottom: 20px;">
                <div class="card-header">
                    <h3 class="card-title">${Utils.sanitizeInput(template.name)}</h3>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-outline" onclick="Templates.useAsWorkout(${template.id})">
                            📝 Als Workout verwenden
                        </button>
                        <button class="btn btn-danger" onclick="Templates.delete(${template.id})">
                            🗑️ Löschen
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <div style="margin-bottom: 15px;">
                        <span class="exercise-tag">${Utils.sanitizeInput(template.category || 'Krafttraining')}</span>
                        <span class="exercise-tag">${template.exercise_count || 0} Übungen</span>
                    </div>
                    ${template.description ? `
                        <p style="color: #666; margin-bottom: 15px;">${Utils.sanitizeInput(template.description)}</p>
                    ` : ''}
                </div>
            </div>
        `).join('');
    },

    // Update template select dropdown
    updateTemplateSelect() {
        const select = document.getElementById('workoutTemplate');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Keine Vorlage verwenden --</option>';
        
        this.templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.name} (${template.exercise_count || 0} Übungen)`;
            select.appendChild(option);
        });
    },

    // Show new template modal
    showNewModal() {
        this.selectedExercises = [];
        this.updateTemplateExerciseSelect();
        this.updateTemplateSelectedExercisesDisplay();
        document.getElementById('newTemplateModal').style.display = 'block';
        
        // URL nicht ändern - Modal bleibt im Hintergrund
        console.log('Template modal opened');
    },

    // Close new template modal
    closeNewModal() {
        document.getElementById('newTemplateModal').style.display = 'none';
        const form = document.getElementById('newTemplateForm');
        if (form) form.reset();
        this.selectedExercises = [];
        console.log('Template modal closed');
    },

    // Update exercise select for templates
    updateTemplateExerciseSelect() {
        const select = document.getElementById('templateExerciseSelect');
        if (!select || !Exercises?.exercises) return;
        
        select.innerHTML = '<option value="">-- Übung auswählen --</option>';
        
        Exercises.exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.id;
            option.textContent = `${exercise.name} (${exercise.muscle_group})`;
            select.appendChild(option);
        });
    },

    // Add exercise to template
    addExercise() {
        const select = document.getElementById('templateExerciseSelect');
        const exerciseId = parseInt(select.value);
        
        if (!exerciseId) {
            Utils.showAlert('Bitte wählen Sie eine Übung aus.', 'warning');
            return;
        }

        if (this.selectedExercises.find(ex => ex.exercise_id === exerciseId)) {
            Utils.showAlert('Diese Übung ist bereits hinzugefügt.', 'warning');
            return;
        }

        const exercise = Exercises.getById(exerciseId);
        if (!exercise) {
            Utils.showAlert('Übung nicht gefunden.', 'error');
            return;
        }

        const templateExercise = {
            exercise_id: exerciseId,
            exercise_name: exercise.name,
            muscle_group: exercise.muscle_group,
            suggested_sets: 3,
            suggested_reps: [10, 10, 10],
            suggested_weight: 0
        };

        this.selectedExercises.push(templateExercise);
        this.updateTemplateSelectedExercisesDisplay();
        
        select.value = '';
    },

    // Quick add exercise for template
    async quickAddExercise() {
        const name = document.getElementById('templateQuickExerciseName').value.trim();
        const category = document.getElementById('templateQuickExerciseCategory').value;
        const muscle_group = document.getElementById('templateQuickExerciseMuscle').value;
        
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
                // Reload exercises
                await Exercises.loadAll();
                this.updateTemplateExerciseSelect();
                
                // Add the new exercise to template
                const templateExercise = {
                    exercise_id: response.exerciseId,
                    exercise_name: name,
                    muscle_group: muscle_group,
                    suggested_sets: 3,
                    suggested_reps: [10, 10, 10],
                    suggested_weight: 0
                };
                
                this.selectedExercises.push(templateExercise);
                this.updateTemplateSelectedExercisesDisplay();
                
                // Clear quick add fields
                document.getElementById('templateQuickExerciseName').value = '';
                document.getElementById('templateQuickExerciseCategory').value = '';
                document.getElementById('templateQuickExerciseMuscle').value = '';
                
                Utils.showAlert('Übung erstellt und zur Vorlage hinzugefügt!', 'success');
            }
        } catch (error) {
            console.error('Quick add exercise error:', error);
            Utils.showAlert('Fehler beim Erstellen der Übung: ' + error.message, 'error');
        }
    },

    // Update selected exercises display for template
    updateTemplateSelectedExercisesDisplay() {
        const container = document.getElementById('templateSelectedExercises');
        if (!container) return;
        
        if (this.selectedExercises.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <h4 style="margin: 20px 0 15px 0; color: #333;">Ausgewählte Übungen:</h4>
            ${this.selectedExercises.map((exercise, index) => `
                <div class="selected-exercise">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h5 style="color: #333;">${Utils.sanitizeInput(exercise.exercise_name)}</h5>
                        <button type="button" class="btn btn-danger" onclick="Templates.removeExercise(${index})" style="padding: 5px 10px; font-size: 12px;">
                            🗑️ Entfernen
                        </button>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                        <div class="form-group">
                            <label>Sätze</label>
                            <input type="number" min="1" max="10" value="${exercise.suggested_sets}" 
                                   onchange="Templates.selectedExercises[${index}].suggested_sets = parseInt(this.value)">
                        </div>
                        <div class="form-group">
                            <label>Wiederholungen</label>
                            <input type="text" placeholder="z.B. 10,8,6" value="${exercise.suggested_reps.join(',')}"
                                   onchange="Templates.selectedExercises[${index}].suggested_reps = this.value.split(',').map(n => parseInt(n.trim()) || 10)">
                        </div>
                        <div class="form-group">
                            <label>Gewicht (kg)</label>
                            <input type="number" min="0" max="1000" step="0.5" value="${exercise.suggested_weight}" 
                                   onchange="Templates.selectedExercises[${index}].suggested_weight = parseFloat(this.value)">
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
    },

    // Remove exercise from template
    removeExercise(index) {
        this.selectedExercises.splice(index, 1);
        this.updateTemplateSelectedExercisesDisplay();
    },

    // Handle template creation - FIXED VERSION
    async handleCreateTemplate(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading"></div> Speichern...';
            
            const formData = new FormData(e.target);
            const templateData = {
                name: formData.get('templateName').trim(),
                category: formData.get('templateCategory'),
                description: formData.get('templateDescription').trim() || null,
                exercises: this.selectedExercises
            };

            if (!templateData.name) {
                throw new Error('Name ist erforderlich');
            }

            if (this.selectedExercises.length === 0) {
                throw new Error('Fügen Sie mindestens eine Übung hinzu');
            }

            console.log('Creating template:', templateData);

            const response = await Utils.apiCall('/templates', {
                method: 'POST',
                body: JSON.stringify(templateData)
            });

            console.log('Template created successfully:', response);
            Utils.showAlert('Vorlage erfolgreich erstellt!', 'success');
            this.closeNewModal();
            await this.loadAll(); // Reload templates
        } catch (error) {
            console.error('Create template error:', error);
            Utils.showAlert('Fehler beim Erstellen der Vorlage: ' + error.message, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    // Delete template
    async delete(templateId) {
        if (!confirm('Sind Sie sicher, dass Sie diese Vorlage löschen möchten?')) {
            return;
        }

        try {
            await Utils.apiCall(`/templates/${templateId}`, {
                method: 'DELETE'
            });
            
            Utils.showAlert('Vorlage erfolgreich gelöscht!', 'success');
            this.loadAll();
        } catch (error) {
            console.error('Delete template error:', error);
            Utils.showAlert('Fehler beim Löschen der Vorlage: ' + error.message, 'error');
        }
    },

    // Use template as workout - mit URL-Fix
    async useAsWorkout(templateId) {
        try {
            const template = await Utils.apiCall(`/templates/${templateId}`);
            
            console.log('Loading template:', template);
            
            // Switch to new workout section - WICHTIG: History pushState verwenden
            history.pushState(null, '', window.location.pathname + '#newWorkout');
            App.showSection('newWorkout');
            
            // Warte kurz bis die Sektion geladen ist
            setTimeout(() => {
                // Fill form with template data
                const nameField = document.getElementById('workoutName');
                const dateField = document.getElementById('workoutDate');
                
                if (nameField) nameField.value = template.name;
                if (dateField) dateField.value = Utils.getCurrentDate();
                
                // Load template exercises into workout
                if (template.exercises && template.exercises.length > 0) {
                    if (typeof Workouts !== 'undefined') {
                        Workouts.selectedExercises = template.exercises.map(ex => ({
                            exercise_id: ex.exercise_id,
                            exercise_name: ex.exercise_name,
                            muscle_group: ex.muscle_group,
                            sets_count: ex.suggested_sets || 3,
                            reps: ex.suggested_reps || [10, 10, 10],
                            weights: new Array(ex.suggested_sets || 3).fill(0),
                            notes: ''
                        }));
                        
                        Workouts.updateSelectedExercisesDisplay();
                    }
                }
                
                Utils.showAlert('Vorlage als Workout geladen!', 'success');
            }, 100);
            
        } catch (error) {
            console.error('Use template as workout error:', error);
            Utils.showAlert('Fehler beim Laden der Vorlage: ' + error.message, 'error');
        }
    },

    // Save current workout as template
    async saveAsTemplate() {
        if (!Workouts?.selectedExercises || Workouts.selectedExercises.length === 0) {
            Utils.showAlert('Fügen Sie erst Übungen zum Workout hinzu', 'warning');
            return;
        }
        
        const templateName = prompt('Name für die Vorlage:');
        if (!templateName) return;
        
        const templateData = {
            name: templateName.trim(),
            category: 'Krafttraining',
            description: `Erstellt aus Workout: ${document.getElementById('workoutName')?.value || 'Unbenannt'}`,
            exercises: Workouts.selectedExercises.map(ex => ({
                exercise_id: ex.exercise_id,
                exercise_name: ex.exercise_name,
                muscle_group: ex.muscle_group,
                suggested_sets: ex.sets_count,
                suggested_reps: ex.reps,
                suggested_weight: 0
            }))
        };
        
        try {
            await Utils.apiCall('/templates', {
                method: 'POST',
                body: JSON.stringify(templateData)
            });
            
            Utils.showAlert('Workout als Vorlage gespeichert!', 'success');
            this.loadAll(); // Refresh templates list
        } catch (error) {
            console.error('Save as template error:', error);
            Utils.showAlert('Fehler beim Speichern der Vorlage: ' + error.message, 'error');
        }
    },

    // Get template by ID
    getById(templateId) {
        return this.templates.find(t => t.id === templateId);
    },

    // Clear cached data
    clearCache() {
        this.templates = [];
        this.selectedExercises = [];
        this.currentTemplate = null;
    },

    // Get all templates
    getTemplates() {
        return this.templates;
    }
};
