// Exercises module for Gym Tracker

const Exercises = {
    // State
    exercises: [],

    // Initialize exercises module
    init() {
        this.setupEventListeners();
    },

    // Setup event listeners
    setupEventListeners() {
        const newExerciseForm = document.getElementById('newExerciseForm');
        if (newExerciseForm) {
            newExerciseForm.addEventListener('submit', this.handleCreateExercise.bind(this));
        }
    },

    // Load all exercises
    async loadAll() {
        try {
            const exercises = await Utils.apiCall('/exercises');
            this.exercises = exercises || [];
            this.updateExerciseSelect();
            return this.exercises;
        } catch (error) {
            console.error('Exercises load error:', error);
            this.exercises = [];
            return [];
        }
    },

    // Load exercises list for display
    async loadList() {
        try {
            App.showLoading('exercisesList');
            
            const exercises = await this.loadAll();
            this.displayExercisesList(exercises);
        } catch (error) {
            console.error('Exercises list load error:', error);
            Utils.showAlert('Fehler beim Laden der Übungen: ' + error.message, 'error');
            this.displayExercisesList([]);
        }
    },

    // Display exercises list
    displayExercisesList(exercises) {
        const container = document.getElementById('exercisesList');
        if (!container) return;
        
        if (exercises.length === 0) {
            App.showEmptyState('exercisesList',
                '💪 Noch keine Übungen vorhanden',
                {
                    text: '➕ Erste Übung erstellen',
                    action: 'Exercises.showNewModal()'
                }
            );
            return;
        }

        // Group exercises by category
        const groupedExercises = exercises.reduce((groups, exercise) => {
            const category = exercise.category;
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(exercise);
            return groups;
        }, {});

        container.innerHTML = Object.keys(groupedExercises).map(category => `
            <div style="margin-bottom: 30px;">
                <h3 style="color: #667eea; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 5px;">
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
                                <div style="margin-top: 8px; color: #666; font-size: 13px;">
                                    <strong>Ausführung:</strong> ${Utils.sanitizeInput(exercise.instructions)}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    },

    // Update exercise select dropdown
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

    // Show new exercise modal
    showNewModal() {
        document.getElementById('newExerciseModal').style.display = 'block';
    },

    // Close new exercise modal
    closeNewModal() {
        document.getElementById('newExerciseModal').style.display = 'none';
        document.getElementById('newExerciseForm').reset();
    },

    // Handle exercise creation
    async handleCreateExercise(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <span style="display: none;">Übung speichern</span>
                <div class="loading" style="margin-left: 10px; display: inline-block;"></div>
            `;
            
            const exerciseData = {
                name: document.getElementById('exerciseName').value.trim(),
                category: document.getElementById('exerciseCategory').value,
                muscle_group: document.getElementById('exerciseMuscleGroup').value,
                description: document.getElementById('exerciseDescription').value.trim() || null,
                instructions: document.getElementById('exerciseInstructions').value.trim() || null
            };

            if (!exerciseData.name) {
                throw new Error('Name ist erforderlich');
            }

            if (!exerciseData.category) {
                throw new Error('Kategorie ist erforderlich');
            }

            if (!exerciseData.muscle_group) {
                throw new Error('Muskelgruppe ist erforderlich');
            }

            const response = await Utils.apiCall('/exercises', {
                method: 'POST',
                body: JSON.stringify(exerciseData)
            });

            Utils.showAlert('Übung erfolgreich erstellt!', 'success');
            this.closeNewModal();
            
            // Reload exercises
            await this.loadAll();
            
            // Refresh current view if on exercises page
            if (App.currentSection === 'exercises') {
                this.loadList();
            }

            return response;
        } catch (error) {
            console.error('Create exercise error:', error);
            Utils.showAlert('Fehler beim Erstellen der Übung: ' + error.message, 'error');
            throw error;
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    // Quick add exercise (for workout creation)
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
                // Reload exercises
                await this.loadAll();
                
                // Add the new exercise to workout
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
                    rest_time: 90,
                    notes: ''
                };
                
                Workouts.selectedExercises.push(workoutExercise);
                Workouts.updateSelectedExercisesDisplay();
                
                // Clear quick add fields
                document.getElementById('quickExerciseName').value = '';
                document.getElementById('quickExerciseCategory').value = '';
                document.getElementById('quickExerciseMuscle').value = '';
                
                Utils.showAlert('Übung erstellt und hinzugefügt!', 'success');
            }
        } catch (error) {
            console.error('Quick add exercise error:', error);
            Utils.showAlert('Fehler beim Erstellen der Übung: ' + error.message, 'error');
        }
    },

    // Get exercise by ID
    getById(exerciseId) {
        return this.exercises.find(ex => ex.id === exerciseId);
    },

    // Get exercises by category
    getByCategory(category) {
        return this.exercises.filter(ex => ex.category === category);
    },

    // Get exercises by muscle group
    getByMuscleGroup(muscleGroup) {
        return this.exercises.filter(ex => ex.muscle_group === muscleGroup);
    },

    // Search exercises
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

    // Get exercise statistics
    getExerciseStats() {
        if (!this.exercises.length) return null;

        const categoryStats = this.exercises.reduce((stats, ex) => {
            stats[ex.category] = (stats[ex.category] || 0) + 1;
            return stats;
        }, {});

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

    // Clear cached data
    clearCache() {
        this.exercises = [];
    },

    // Get exercises data
    getExercises() {
        return this.exercises;
    },

    // Update exercise (for future use)
    async update(exerciseId, exerciseData) {
        try {
            await Utils.apiCall(`/exercises/${exerciseId}`, {
                method: 'PUT',
                body: JSON.stringify(exerciseData)
            });
            
            Utils.showAlert('Übung erfolgreich aktualisiert!', 'success');
            await this.loadAll();
            
            if (App.currentSection === 'exercises') {
                this.loadList();
            }
        } catch (error) {
            console.error('Update exercise error:', error);
            Utils.showAlert('Fehler beim Aktualisieren der Übung: ' + error.message, 'error');
            throw error;
        }
    },

    // Delete exercise (for future use)
    async delete(exerciseId) {
        if (!confirm('Sind Sie sicher, dass Sie diese Übung löschen möchten?')) {
            return;
        }

        try {
            await Utils.apiCall(`/exercises/${exerciseId}`, {
                method: 'DELETE'
            });
            
            Utils.showAlert('Übung erfolgreich gelöscht!', 'success');
            await this.loadAll();
            
            if (App.currentSection === 'exercises') {
                this.loadList();
            }
        } catch (error) {
            console.error('Delete exercise error:', error);
            Utils.showAlert('Fehler beim Löschen der Übung: ' + error.message, 'error');
        }
    },

    // Get popular exercises (based on usage in workouts)
    getPopularExercises(limit = 10) {
        // This would need workout data to calculate usage
        // For now, return first N exercises
        return this.exercises.slice(0, limit);
    },

    // Filter exercises for dropdown
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

    // Validate exercise data
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
        
        // Check for valid categories
        const validCategories = Utils.getExerciseCategories();
        if (data.category && !validCategories.includes(data.category)) {
            errors.push('Ungültige Kategorie');
        }
        
        // Check for valid muscle groups
        const validMuscleGroups = Utils.getMuscleGroups();
        if (data.muscle_group && !validMuscleGroups.includes(data.muscle_group)) {
            errors.push('Ungültige Muskelgruppe');
        }
        
        return errors;
    }
};
