// Gym Tracker Frontend Application
class GymTracker {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('token');
        this.user = null;
        this.currentWorkoutSession = null;
        this.workoutTimer = null;
        this.currentPage = 'dashboard';
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        
        if (this.token) {
            try {
                await this.loadUser();
                this.showMainApp();
            } catch (error) {
            this.showNotification('error', 'Registrierung fehlgeschlagen', error.message);
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;

        try {
            await this.apiCall('/forgot-password', 'POST', { email });
            this.showNotification('success', 'E-Mail gesendet', 'Falls die E-Mail-Adresse existiert, wurde ein Reset-Link gesendet');
            this.showLoginScreen();
        } catch (error) {
            this.showNotification('error', 'Fehler', error.message);
        }
    }

    async handleUpdateProfile(e) {
        e.preventDefault();
        const username = document.getElementById('profile-username').value;
        const email = document.getElementById('profile-email').value;
        const firstName = document.getElementById('profile-firstname').value;
        const lastName = document.getElementById('profile-lastname').value;
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;

        if (newPassword && newPassword !== confirmNewPassword) {
            this.showNotification('error', 'Fehler', 'Neue Passwörter stimmen nicht überein');
            return;
        }

        try {
            await this.apiCall('/profile', 'PUT', {
                username, email, firstName, lastName,
                currentPassword: currentPassword || undefined,
                newPassword: newPassword || undefined
            });
            this.showNotification('success', 'Profil aktualisiert', 'Deine Änderungen wurden gespeichert');
            await this.loadUser();
            this.updateUserDisplay();
            // Clear password fields
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-new-password').value = '';
        } catch (error) {
            this.showNotification('error', 'Fehler', error.message);
        }
    }

    async loadUser() {
        const response = await this.apiCall('/profile', 'GET');
        this.user = response;
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        this.showLoginScreen();
        this.showNotification('success', 'Abgemeldet', 'Du wurdest erfolgreich abgemeldet');
    }

    // Screen navigation
    showLoginScreen() {
        this.hideAllScreens();
        document.getElementById('login-screen').style.display = 'flex';
    }

    showRegisterScreen() {
        this.hideAllScreens();
        document.getElementById('register-screen').style.display = 'flex';
    }

    showForgotPasswordScreen() {
        this.hideAllScreens();
        document.getElementById('forgot-password-screen').style.display = 'flex';
    }

    showMainApp() {
        this.hideAllScreens();
        document.getElementById('main-app').style.display = 'block';
        this.updateUserDisplay();
        this.showPage('dashboard');
    }

    hideAllScreens() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('register-screen').style.display = 'none';
        document.getElementById('forgot-password-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'none';
    }

    updateUserDisplay() {
        if (this.user) {
            document.getElementById('user-name').textContent = this.user.username;
            
            // Update profile form
            document.getElementById('profile-username').value = this.user.username || '';
            document.getElementById('profile-email').value = this.user.email || '';
            document.getElementById('profile-firstname').value = this.user.firstName || '';
            document.getElementById('profile-lastname').value = this.user.lastName || '';
        }
    }

    // Page navigation
    showPage(pageName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageName);
        });

        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.toggle('active', page.id === `${pageName}-page`);
        });

        this.currentPage = pageName;

        // Load page-specific content
        switch (pageName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'workout':
                this.loadWorkouts();
                break;
            case 'history':
                this.loadHistory();
                break;
            case 'records':
                this.loadPersonalRecords();
                break;
            case 'exercises':
                this.loadExercises();
                break;
            case 'profile':
                // Profile is already loaded in updateUserDisplay
                break;
        }
    }

    // Dashboard methods
    async loadDashboard() {
        try {
            // Load recent workouts
            const sessions = await this.apiCall('/sessions?limit=5', 'GET');
            this.renderRecentWorkouts(sessions);

            // Load stats
            const personalRecords = await this.apiCall('/personal-records', 'GET');
            document.getElementById('total-workouts').textContent = sessions.length;
            document.getElementById('total-prs').textContent = personalRecords.length;
        } catch (error) {
            console.error('Dashboard loading error:', error);
        }
    }

    renderRecentWorkouts(sessions) {
        const container = document.getElementById('recent-workouts');
        
        if (sessions.length === 0) {
            container.innerHTML = '<p class="text-center">Noch keine Workouts vorhanden</p>';
            return;
        }

        container.innerHTML = sessions.map(session => `
            <div class="history-item" onclick="app.viewSession(${session.id})">
                <div class="history-header">
                    <div>
                        <h3>${session.name}</h3>
                        <div class="history-date">${this.formatDate(session.start_time)}</div>
                    </div>
                    <div class="history-duration">${this.formatDuration(session.start_time, session.end_time)}</div>
                </div>
                <div class="history-stats">
                    <span>${session.exercise_count} Übungen</span>
                    <span>${session.total_sets} Sätze</span>
                </div>
            </div>
        `).join('');
    }

    // Workout methods
    async loadWorkouts() {
        try {
            const workouts = await this.apiCall('/workouts', 'GET');
            this.renderWorkoutTemplates(workouts);
        } catch (error) {
            console.error('Workouts loading error:', error);
        }
    }

    renderWorkoutTemplates(workouts) {
        const container = document.getElementById('workout-templates-list');
        
        if (workouts.length === 0) {
            container.innerHTML = '<p class="text-center">Noch keine Workout-Templates erstellt</p>';
            return;
        }

        container.innerHTML = workouts.map(workout => `
            <div class="workout-template" onclick="app.startWorkout(${workout.id})">
                <h4>${workout.name}</h4>
                <p>${workout.description || 'Kein Beschreibung'}</p>
                <div class="template-meta">
                    <span>${workout.exercise_count} Übungen</span>
                    <span>${this.formatDate(workout.created_at)}</span>
                </div>
            </div>
        `).join('');
    }

    async startWorkout(workoutId) {
        try {
            const workout = await this.apiCall(`/workouts/${workoutId}`, 'GET');
            const session = await this.apiCall('/sessions', 'POST', {
                workoutId: workoutId,
                name: workout.name
            });

            this.currentWorkoutSession = session.id;
            this.showActiveWorkout(workout.name);
            this.startWorkoutTimer();

            // Add exercises from template
            for (const exercise of workout.exercises) {
                await this.addExerciseToSession(exercise.exercise_id);
            }

            this.loadActiveWorkout();
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Workout konnte nicht gestartet werden');
        }
    }

    async startEmptyWorkout() {
        try {
            const session = await this.apiCall('/sessions', 'POST', {
                name: 'Mein Workout'
            });

            this.currentWorkoutSession = session.id;
            this.showActiveWorkout('Mein Workout');
            this.startWorkoutTimer();
            this.loadActiveWorkout();
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Workout konnte nicht gestartet werden');
        }
    }

    showActiveWorkout(name) {
        document.getElementById('workout-content').style.display = 'none';
        document.getElementById('active-workout').style.display = 'block';
        document.getElementById('active-workout-name').textContent = name;
    }

    hideActiveWorkout() {
        document.getElementById('workout-content').style.display = 'block';
        document.getElementById('active-workout').style.display = 'none';
        this.stopWorkoutTimer();
        this.currentWorkoutSession = null;
    }

    startWorkoutTimer() {
        const startTime = new Date();
        this.workoutTimer = setInterval(() => {
            const elapsed = new Date() - startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('workout-time').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopWorkoutTimer() {
        if (this.workoutTimer) {
            clearInterval(this.workoutTimer);
            this.workoutTimer = null;
        }
    }

    async loadActiveWorkout() {
        if (!this.currentWorkoutSession) return;

        try {
            const session = await this.apiCall(`/sessions/${this.currentWorkoutSession}`, 'GET');
            this.renderActiveWorkoutExercises(session.exercises || []);
        } catch (error) {
            console.error('Active workout loading error:', error);
        }
    }

    async renderActiveWorkoutExercises(exercises) {
        const container = document.getElementById('workout-exercises');
        
        if (exercises.length === 0) {
            container.innerHTML = `
                <div class="text-center">
                    <p>Noch keine Übungen hinzugefügt</p>
                    <button class="btn-primary mt-2" onclick="app.showAddExerciseModal()">Erste Übung hinzufügen</button>
                </div>
            `;
            return;
        }

        let html = '';
        for (const exercise of exercises) {
            // Load last performance
            let lastPerformance = [];
            try {
                lastPerformance = await this.apiCall(`/exercises/${exercise.exercise_id}/last-performance`, 'GET');
            } catch (error) {
                console.error('Last performance loading error:', error);
            }

            html += `
                <div class="exercise-card">
                    <div class="exercise-header">
                        <h3>${exercise.exercise_name}</h3>
                        <div class="exercise-meta">${exercise.weight_type}</div>
                    </div>
                    <div class="sets-container">
                        ${this.renderPreviousPerformance(lastPerformance)}
                        ${this.renderSets(exercise.sets || [], exercise.id, exercise.weight_type)}
                        <button class="add-set-btn" onclick="app.addSet(${exercise.id}, '${exercise.weight_type}')">
                            + Satz hinzufügen
                        </button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    renderPreviousPerformance(performance) {
        if (performance.length === 0) return '';
        
        return `
            <div class="previous-performance">
                Letztes Mal: ${performance.map(p => `${p.weight}${p.weight > 0 ? 'kg' : ''} × ${p.reps}`).join(', ')}
            </div>
        `;
    }

    renderSets(sets, sessionExerciseId, weightType) {
        return sets.map((set, index) => `
            <div class="set-item">
                <div class="set-number">${set.setNumber}</div>
                ${weightType !== 'none' ? `<input type="number" class="set-input" placeholder="Gewicht" value="${set.weight || ''}" onchange="app.updateSet(${set.id}, 'weight', this.value)">` : '<div></div>'}
                <input type="number" class="set-input" placeholder="Wdh." value="${set.reps || ''}" onchange="app.updateSet(${set.id}, 'reps', this.value)">
                <div class="performance-buttons">
                    <button class="performance-btn ${set.performance === 'worse' ? 'active' : ''}" onclick="app.updateSet(${set.id}, 'performance', 'worse')">↓</button>
                    <button class="performance-btn ${set.performance === 'same' ? 'active' : ''}" onclick="app.updateSet(${set.id}, 'performance', 'same')">→</button>
                    <button class="performance-btn ${set.performance === 'better' ? 'active' : ''}" onclick="app.updateSet(${set.id}, 'performance', 'better')">↑</button>
                </div>
                <button class="delete-set-btn" onclick="app.deleteSet(${set.id})">×</button>
            </div>
        `).join('');
    }

    async addExerciseToSession(exerciseId) {
        if (!this.currentWorkoutSession) return;

        try {
            await this.apiCall(`/sessions/${this.currentWorkoutSession}/exercises`, 'POST', {
                exerciseId: exerciseId
            });
            this.loadActiveWorkout();
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Übung konnte nicht hinzugefügt werden');
        }
    }

    async addSet(sessionExerciseId, weightType) {
        try {
            await this.apiCall(`/sessions/${this.currentWorkoutSession}/exercises/${sessionExerciseId}/sets`, 'POST', {
                weight: 0,
                reps: 0,
                completed: false
            });
            this.loadActiveWorkout();
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Satz konnte nicht hinzugefügt werden');
        }
    }

    async updateSet(setId, field, value) {
        // This would need a PUT endpoint for sets - simplified for now
        console.log('Update set:', setId, field, value);
    }

    async deleteSet(setId) {
        try {
            await this.apiCall(`/sets/${setId}`, 'DELETE');
            this.loadActiveWorkout();
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Satz konnte nicht gelöscht werden');
        }
    }

    async finishWorkout() {
        if (!this.currentWorkoutSession) return;

        try {
            await this.apiCall(`/sessions/${this.currentWorkoutSession}/finish`, 'PUT', {
                notes: ''
            });
            this.hideActiveWorkout();
            this.showNotification('success', 'Workout beendet', 'Gut gemacht!');
            this.showPage('history');
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Workout konnte nicht beendet werden');
        }
    }

    // History methods
    async loadHistory() {
        try {
            const sessions = await this.apiCall('/sessions', 'GET');
            this.renderHistory(sessions);
        } catch (error) {
            console.error('History loading error:', error);
        }
    }

    renderHistory(sessions) {
        const container = document.getElementById('workout-history');
        
        if (sessions.length === 0) {
            container.innerHTML = '<p class="text-center">Noch keine Workouts in der Historie</p>';
            return;
        }

        container.innerHTML = sessions.map(session => `
            <div class="history-item" onclick="app.viewSession(${session.id})">
                <div class="history-header">
                    <div>
                        <h3>${session.name}</h3>
                        <div class="history-date">${this.formatDate(session.start_time)}</div>
                    </div>
                    <div class="history-duration">${this.formatDuration(session.start_time, session.end_time)}</div>
                </div>
                <div class="history-stats">
                    <span>${session.exercise_count} Übungen</span>
                    <span>${session.total_sets} Sätze</span>
                    ${session.end_time ? '<span>✓ Beendet</span>' : '<span>⏸ Pausiert</span>'}
                </div>
            </div>
        `).join('');
    }

    async viewSession(sessionId) {
        try {
            const session = await this.apiCall(`/sessions/${sessionId}`, 'GET');
            this.showSessionDetailsModal(session);
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Session-Details konnten nicht geladen werden');
        }
    }

    showSessionDetailsModal(session) {
        const modalBody = `
            <h4>${session.name}</h4>
            <p><strong>Datum:</strong> ${this.formatDate(session.start_time)}</p>
            <p><strong>Dauer:</strong> ${this.formatDuration(session.start_time, session.end_time)}</p>
            
            <h5 class="mt-3">Übungen:</h5>
            ${session.exercises?.map(exercise => `
                <div class="mb-3">
                    <strong>${exercise.exercise_name}</strong>
                    ${exercise.sets?.map(set => `
                        <div>Satz ${set.setNumber}: ${set.weight ? set.weight + 'kg × ' : ''}${set.reps} Wdh.</div>
                    `).join('') || ''}
                </div>
            `).join('') || '<p>Keine Übungen</p>'}
            
            ${session.notes ? `<p><strong>Notizen:</strong> ${session.notes}</p>` : ''}
        `;
        
        this.showModal('Workout Details', modalBody);
    }

    // Personal Records methods
    async loadPersonalRecords() {
        try {
            const records = await this.apiCall('/personal-records', 'GET');
            this.renderPersonalRecords(records);
        } catch (error) {
            console.error('Personal records loading error:', error);
        }
    }

    renderPersonalRecords(records) {
        const container = document.getElementById('personal-records');
        
        if (records.length === 0) {
            container.innerHTML = '<p class="text-center">Noch keine Personal Records</p>';
            return;
        }

        container.innerHTML = records.map(record => `
            <div class="record-item">
                <div class="record-header">
                    <h3>${record.exercise_name}</h3>
                </div>
                <div class="record-value">
                    ${record.weight ? record.weight + 'kg × ' : ''}${record.reps} Wdh.
                </div>
                <div class="record-date">${this.formatDate(record.date_achieved)}</div>
            </div>
        `).join('');
    }

    // Exercise methods
    async loadExercises() {
        try {
            const exercises = await this.apiCall('/exercises', 'GET');
            this.renderExercises(exercises);
        } catch (error) {
            console.error('Exercises loading error:', error);
        }
    }

    renderExercises(exercises) {
        const container = document.getElementById('exercises-list');
        
        if (exercises.length === 0) {
            container.innerHTML = '<p class="text-center">Noch keine Übungen erstellt</p>';
            return;
        }

        container.innerHTML = exercises.map(exercise => `
            <div class="exercise-item">
                <h3>${exercise.name}</h3>
                ${exercise.category_name ? `<div class="exercise-category">${exercise.category_name}</div>` : ''}
                <div class="exercise-weight-type">${exercise.weight_type}</div>
                ${exercise.description ? `<p>${exercise.description}</p>` : ''}
            </div>
        `).join('');
    }

    // Modal methods
    showModal(title, body) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = body;
        document.getElementById('modal-overlay').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('modal-overlay').style.display = 'none';
    }

    async showCreateExerciseModal() {
        try {
            const categories = await this.apiCall('/exercise-categories', 'GET');
            const categoryOptions = categories.map(cat => 
                `<option value="${cat.id}">${cat.name}</option>`
            ).join('');

            const modalBody = `
                <form id="create-exercise-form">
                    <div class="form-group">
                        <label for="exercise-name">Name</label>
                        <input type="text" id="exercise-name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="exercise-description">Beschreibung</label>
                        <textarea id="exercise-description" rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="exercise-category">Kategorie</label>
                        <select id="exercise-category">
                            <option value="">Keine Kategorie</option>
                            ${categoryOptions}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="exercise-weight-type">Gewichtstyp</label>
                        <select id="exercise-weight-type">
                            <option value="kg">Kilogramm</option>
                            <option value="lbs">Pfund</option>
                            <option value="none">Kein Gewicht</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="btn-primary">Übung erstellen</button>
                </form>
            `;

            this.showModal('Neue Übung erstellen', modalBody);

            document.getElementById('create-exercise-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.createExercise();
            });
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Kategorien konnten nicht geladen werden');
        }
    }

    async createExercise() {
        const name = document.getElementById('exercise-name').value;
        const description = document.getElementById('exercise-description').value;
        const categoryId = document.getElementById('exercise-category').value;
        const weightType = document.getElementById('exercise-weight-type').value;

        try {
            await this.apiCall('/exercises', 'POST', {
                name,
                description: description || undefined,
                categoryId: categoryId || undefined,
                weightType
            });

            this.closeModal();
            this.showNotification('success', 'Übung erstellt', `${name} wurde erfolgreich erstellt`);
            this.loadExercises();
        } catch (error) {
            this.showNotification('error', 'Fehler', error.message);
        }
    }

    async showAddExerciseModal() {
        try {
            const exercises = await this.apiCall('/exercises', 'GET');
            const exerciseOptions = exercises.map(ex => 
                `<option value="${ex.id}">${ex.name}</option>`
            ).join('');

            const modalBody = `
                <form id="add-exercise-form">
                    <div class="form-group">
                        <label for="select-exercise">Übung auswählen</label>
                        <select id="select-exercise" required>
                            <option value="">Übung auswählen</option>
                            ${exerciseOptions}
                        </select>
                    </div>
                    
                    <button type="submit" class="btn-primary">Zur Session hinzufügen</button>
                </form>
                
                <hr class="mt-3 mb-3">
                
                <button class="btn-secondary" onclick="app.showCreateExerciseModal()">
                    Neue Übung erstellen
                </button>
            `;

            this.showModal('Übung hinzufügen', modalBody);

            document.getElementById('add-exercise-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const exerciseId = document.getElementById('select-exercise').value;
                if (exerciseId) {
                    await this.addExerciseToSession(parseInt(exerciseId));
                    this.closeModal();
                }
            });
        } catch (error) {
            this.showNotification('error', 'Fehler', 'Übungen konnten nicht geladen werden');
        }
    }

    // Utility methods
    async apiCall(endpoint, method = 'GET', data = null) {
        const url = this.baseURL + endpoint;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'API call failed');
        }

        return result;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDuration(startTime, endTime) {
        if (!endTime) return 'Läuft...';
        
        const start = new Date(startTime);
        const end = new Date(endTime);
        const duration = end - start;
        
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    showNotification(type, title, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
            <button class="notification-close">&times;</button>
        `;

        document.getElementById('notifications').appendChild(notification);

        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Global functions for onclick handlers
window.startQuickWorkout = () => app.startEmptyWorkout();
window.startEmptyWorkout = () => app.startEmptyWorkout();
window.showPage = (page) => app.showPage(page);

// Event handlers that need to be global
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for workout controls
    document.getElementById('add-exercise-btn')?.addEventListener('click', () => app.showAddExerciseModal());
    document.getElementById('finish-workout-btn')?.addEventListener('click', () => app.finishWorkout());
});

// Initialize app
const app = new GymTracker();) {
                this.logout();
            }
        } else {
            this.showLoginScreen();
        }
    }

    setupEventListeners() {
        // Auth form handlers
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('forgot-password-form').addEventListener('submit', (e) => this.handleForgotPassword(e));
        document.getElementById('profile-form').addEventListener('submit', (e) => this.handleUpdateProfile(e));

        // Auth screen navigation
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterScreen();
        });
        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginScreen();
        });
        document.getElementById('show-forgot-password').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForgotPasswordScreen();
        });
        document.getElementById('back-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginScreen();
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.showPage(page);
            });
        });

        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Modal handlers
        document.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') {
                this.closeModal();
            }
        });

        // Button handlers
        document.getElementById('create-exercise-btn').addEventListener('click', () => this.showCreateExerciseModal());
        document.getElementById('create-workout-btn').addEventListener('click', () => this.showCreateWorkoutModal());
    }

    // Authentication methods
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await this.apiCall('/login', 'POST', { email, password });
            this.token = response.token;
            this.user = response.user;
            localStorage.setItem('token', this.token);
            this.showMainApp();
            this.showNotification('success', 'Willkommen zurück!', `Hallo ${this.user.username}`);
        } catch (error) {
            this.showNotification('error', 'Anmeldung fehlgeschlagen', error.message);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        const firstName = document.getElementById('register-firstname').value;
        const lastName = document.getElementById('register-lastname').value;

        if (password !== passwordConfirm) {
            this.showNotification('error', 'Registrierung fehlgeschlagen', 'Passwörter stimmen nicht überein');
            return;
        }

        try {
            const response = await this.apiCall('/register', 'POST', {
                username, email, password, firstName, lastName
            });
            this.token = response.token;
            this.user = response.user;
            localStorage.setItem('token', this.token);
            this.showMainApp();
            this.showNotification('success', 'Registrierung erfolgreich', `Willkommen ${this.user.username}!`);
        } catch (error