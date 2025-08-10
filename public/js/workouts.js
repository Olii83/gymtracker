// Workouts module for Gym Tracker

const Workouts = {
    // State
    workouts: [],
    selectedExercises: [],
    currentWorkout: null,

    // Initialize workouts module
    init() {
        this.setupEventListeners();
    },

    // Setup event listeners
    setupEventListeners() {
        const newWorkoutForm = document.getElementById('newWorkoutForm');
        if (newWorkoutForm) {
            newWorkoutForm.addEventListener('submit', this.handleCreateWorkout.bind(this));
        }
    },

    // Load all workouts
    async loadAll() {
        try {
            App.showLoading('workoutsList');
            
            const workouts = await Utils.apiCall('/workouts');
            this.workouts = workouts || [];
            this.displayWorkouts(this.workouts);
        } catch (error) {
            console.error('Workouts load error:', error);
            Utils.showAlert('Fehler beim Laden der Trainings: ' + error.message, 'error');
            this.displayWorkouts([]);
        }
    },

    // Display workouts list
    displayWorkouts(workouts) {
        const container = document.getElementById('workoutsList');
        if (!container) return;
        
        if (workouts.length === 0) {
            App.showEmptyState('workoutsList', 
                '🏃‍♀️ Noch keine Trainings vorhanden',
                { 
                    text: '➕ Erstes Training erstellen',
                    action: "App.showSection('newWorkout')"
                }
            );
            return;
        }

        container.innerHTML = workouts.map(workout => `
            <div class="workout-item" onclick="Workouts.showDetail(${workout.id})">
                <div class="workout-date">${Utils.formatDate(workout.date)}</div>
                <div class="workout-name">${Utils.sanitizeInput(workout.name)}</div>
                <div class="workout-duration">
                    ${workout.duration_minutes ? 
                        `⏱️ ${Utils.formatDuration(workout.duration_minutes)}` : 
                        '⏱️ Dauer nicht erfasst'
                    }
                </div>
            </div>
        `).join('');
    },

    // Show workout detail modal
    async showDetail(workoutId) {
        try {
            const workout = await Utils.apiCall(`/workouts/${workoutId}`);
            this.currentWorkout = workout;
            
            const modal = document.getElementById('workoutDetailModal');
            const content = document.getElementById('workoutDetailContent');
            
            content.innerHTML = this.generateWorkoutDetailHTML(workout);
            modal.style.display = 'block';
        } catch (error) {
            console.error('Workout detail error:', error);
            Utils.showAlert('Fehler beim Laden der Trainingsdetails: ' + error.message, 'error');
        }
    },

    // Generate workout detail HTML
    generateWorkoutDetailHTML(workout) {
        const exercisesHTML = workout.exercises && workout.exercises.length > 0 ? `
            <h3 style="margin-bottom: 15px; color: #333;">💪 Übungen</h3>
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
        ` : '<p style="color: #666;">Keine Übungen erfasst.</p>';

        return `
            <h2 style="margin-bottom: 20px; color: #333;">${Utils.sanitizeInput(workout.name)}</h2>
            <div style="margin-bottom: 20px;">
                <p><strong>📅 Datum:</strong> ${Utils.formatDate(workout.date)}</p>
                <p><strong>⏱️ Dauer:</strong> ${workout.duration_minutes ? Utils.formatDuration(workout.duration_minutes) : 'Nicht erfasst'}</p>
                ${workout.notes ? `<p><strong>📝 Notizen:</strong> ${Utils.sanitizeInput(workout.notes)}</p>` : ''}
            </div>
            
            ${exercisesHTML}
            
            <div style="margin-top: 30px; display: flex; gap: 10px;">
                <button class="btn btn-danger" onclick="Workouts.delete(${workout.id})">🗑️ Löschen</button>
                <button class="btn btn-secondary" onclick="Workouts.closeDetailModal()">❌ Schließen</button>
            </div>
        `;
    },

    // Close workout detail modal
    closeDetailModal() {
        document.getElementById('workoutDetailModal').style.display = 'none';
        this.currentWorkout = null;
    },

    // Delete workout
    async delete(workoutId) {
        if (!confirm('Sind Sie sicher, dass Sie dieses Training löschen möchten?')) {
            return;
        }

        try {
            await Utils.apiCall(`/workouts/${workoutId}`, { method: 'DELETE' });
            Utils.showAlert('Training erfolgreich gelöscht!', 'success');
            this.closeDetailModal();
            this.loadAll();
            App.refresh(); // Refresh dashboard if it's current section
        } catch (error) {
            console.error('Delete workout error:', error);
            Utils.showAlert('Fehler beim Löschen des Trainings: ' + error.message, 'error');
        }
    },

    // Reset workout form
    resetForm() {
        const form = document.getElementById('newWorkoutForm');
        if (form) {
            form.reset();
        }
        
        const selectedExercisesContainer = document.getElementById('selectedExercises');
        if (selectedExercisesContainer) {
            selectedExercisesContainer.innerHTML = '';
        }
        
        this.selectedExercises = [];
        
        // Set today's date
        const workoutDateInput = document.getElementById('workoutDate');
        if (workoutDateInput) {
            workoutDateInput.value = Utils.getCurrentDate();
        }
    },

    // Add exercise to workout
    addExercise() {
        const select = document.getElementById('exerciseSelect');
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

        const workoutExercise = {
            exercise_id: exerciseId,
            exercise_name: exercise.name,
            muscle_group: exercise.muscle_group,
            sets_count: 3,
            reps: [10, 10, 10],
            weights: [0, 0, 0],
            rest_time: 90,
            notes: ''
        };

        this.selectedExercises.push(workoutExercise);
        this.updateSelectedExercisesDisplay();
        
        select.value = '';
    },

    // Update selected exercises display
    updateSelectedExercisesDisplay() {
        const container = document.getElementById('selectedExercises');
        if (!container) return;
        
        if (this.selectedExercises.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <h3 style="margin-bottom: 15px; color: #333;">Ausgewählte Übungen:</h3>
            ${this.selectedExercises.map((exercise, index) => `
                <div class="selected-exercise">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4 style="color: #333;">${Utils.sanitizeInput(exercise.exercise_name)}</h4>
                        <button type="button" class="btn btn-danger" onclick="Workouts.removeExercise(${index})" style="padding: 5px 10px; font-size: 12px;">
                            🗑️ Entfernen
                        </button>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label>Anzahl Sätze:</label>
                        <input type="number" min="1" max="10" value="${exercise.sets_count}" 
                               onchange="Workouts.updateExerciseSets(${index}, this.value)" 
                               style="width: 80px; margin-left: 10px; padding: 5px;">
                    </div>
                    
                    <div class="sets-input" id="sets-${index}">
                        <!-- Sets will be generated here -->
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <label>Pause zwischen Sätzen (Sekunden):</label>
                        <input type="number" min="0" max="600" value="${exercise.rest_time}" 
                               onchange="Workouts.selectedExercises[${index}].rest_time = parseInt(this.value)"
                               style="width: 80px; margin-left: 10px; padding: 5px;">
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <label>Notizen:</label>
                        <input type="text" placeholder="Besonderheiten, Technik-Tipps..." 
                               value="${exercise.notes}"
                               onchange="Workouts.selectedExercises[${index}].notes = this.value"
                               style="width: 100%; margin-top: 5px; padding: 8px;">
                    </div>
                </div>
            `).join('')}
        `;

        this.selectedExercises.forEach((exercise, index) => {
            this.updateSetsDisplay(index);
        });
    },

    // Update exercise sets count
    updateExerciseSets(exerciseIndex, setsCount) {
        const count = parseInt(setsCount);
        if (count < 1 || count > 10) return;

        const exercise = this.selectedExercises[exerciseIndex];
        exercise.sets_count = count;
        
        // Adjust arrays
        while (exercise.reps.length < count) {
            exercise.reps.push(exercise.reps[exercise.reps.length - 1] || 10);
            exercise.weights.push(exercise.weights[exercise.weights.length - 1] || 0);
        }
        
        exercise.reps = exercise.reps.slice(0, count);
        exercise.weights = exercise.weights.slice(0, count);
        
        this.updateSetsDisplay(exerciseIndex);
    },

    // Update sets display for an exercise
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

    // Remove exercise from workout
    removeExercise(index) {
        this.selectedExercises.splice(index, 1);
        this.updateSelectedExercisesDisplay();
    },

    // Handle workout creation
    async handleCreateWorkout(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <span style="display: none;">Training speichern</span>
                <div class="loading" style="margin-left: 10px; display: inline-block;"></div>
            `;
            
            const workoutData = {
                name: document.getElementById('workoutName').value.trim(),
                date: document.getElementById('workoutDate').value,
                duration_minutes: parseInt(document.getElementById('workoutDuration').value) || null,
                notes: document.getElementById('workoutNotes').value.trim() || null,
                exercises: this.selectedExercises
            };

            if (!workoutData.name) {
                throw new Error('Trainingsname ist erforderlich');
            }

            if (!workoutData.date) {
                throw new Error('Datum ist erforderlich');
            }

            await Utils.apiCall('/workouts', {
                method: 'POST',
                body: JSON.stringify(workoutData)
            });

            Utils.showAlert('Training erfolgreich gespeichert!', 'success');
            App.showSection('dashboard');
        } catch (error) {
            console.error('Create workout error:', error);
            Utils.showAlert('Fehler beim Speichern des Trainings: ' + error.message, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    // Get workout by ID
    getById(workoutId) {
        return this.workouts.find(w => w.id === workoutId);
    },

    // Clear cached data
    clearCache() {
        this.workouts = [];
        this.selectedExercises = [];
        this.currentWorkout = null;
    },

    // Get workouts data
    getWorkouts() {
        return this.workouts;
    },

    // Get selected exercises
    getSelectedExercises() {
        return this.selectedExercises;
    },

    // Update workout (for future use)
    async update(workoutId, workoutData) {
        try {
            await Utils.apiCall(`/workouts/${workoutId}`, {
                method: 'PUT',
                body: JSON.stringify(workoutData)
            });
            
            Utils.showAlert('Training erfolgreich aktualisiert!', 'success');
            this.loadAll();
        } catch (error) {
            console.error('Update workout error:', error);
            Utils.showAlert('Fehler beim Aktualisieren des Trainings: ' + error.message, 'error');
            throw error;
        }
    },

    // Get workout statistics
    getWorkoutStats() {
        if (!this.workouts.length) return null;

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const thisWeek = this.workouts.filter(w => new Date(w.date) >= oneWeekAgo);
        const thisMonth = this.workouts.filter(w => new Date(w.date) >= oneMonthAgo);
        
        const totalMinutes = this.workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
        const avgDuration = totalMinutes / this.workouts.length;

        return {
            total: this.workouts.length,
            thisWeek: thisWeek.length,
            thisMonth: thisMonth.length,
            totalMinutes,
            avgDuration: Math.round(avgDuration),
            longestWorkout: Math.max(...this.workouts.map(w => w.duration_minutes || 0)),
            mostRecentDate: this.workouts.length > 0 ? 
                Math.max(...this.workouts.map(w => new Date(w.date).getTime())) : null
        };
    },

    // Duplicate workout (for future use)
    duplicateWorkout(workoutId) {
        const workout = this.getById(workoutId);
        if (!workout) {
            Utils.showAlert('Training nicht gefunden', 'error');
            return;
        }

        // Pre-fill form with workout data
        document.getElementById('workoutName').value = workout.name + ' (Kopie)';
        document.getElementById('workoutDate').value = Utils.getCurrentDate();
        document.getElementById('workoutDuration').value = workout.duration_minutes || '';
        document.getElementById('workoutNotes').value = workout.notes || '';

        // Copy exercises if available
        if (workout.exercises && workout.exercises.length > 0) {
            this.selectedExercises = workout.exercises.map(ex => ({
                exercise_id: ex.exercise_id,
                exercise_name: ex.exercise_name,
                muscle_group: ex.muscle_group,
                sets_count: ex.sets_count,
                reps: [...ex.reps],
                weights: [...ex.weights],
                rest_time: ex.rest_time,
                notes: ex.notes
            }));
            this.updateSelectedExercisesDisplay();
        }

        App.showSection('newWorkout');
        Utils.showAlert('Training zum Duplizieren vorbereitet', 'info');
    }
};
