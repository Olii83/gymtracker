// Main application module for Gym Tracker - Updated without duration

const App = {
    // Application state
    currentSection: 'dashboard',
    dashboardData: null,

    // Initialize the application
    init() {
        console.log('Initializing Gym Tracker...');
        
        // Initialize all modules
        Auth.init();
        Workouts.init();
        Exercises.init();
        Admin.init();
        
        // Set today's date as default for new workout
        const workoutDateInput = document.getElementById('workoutDate');
        if (workoutDateInput) {
            workoutDateInput.value = Utils.getCurrentDate();
        }
        
        console.log('Gym Tracker initialized successfully');
    },

    // Show a specific section
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // Update navigation button states
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Show the requested section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            this.currentSection = sectionName;
            
            // Load section-specific data
            this.loadSectionData(sectionName);
        } else {
            console.error(`Section '${sectionName}' not found`);
        }
    },

    // Load data for specific section
    loadSectionData(sectionName) {
        switch(sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'workouts':
                Workouts.loadAll();
                break;
            case 'exercises':
                Exercises.loadList();
                break;
            case 'templates':
                Templates.loadAll();
                break;
            case 'newWorkout':
                // Reset form when entering new workout section
                if (!Workouts.isEditing) {
                    Workouts.resetForm();
                }
                // Load exercises for selection
                Exercises.loadAll();
                // Load templates for dropdown
                Templates.loadAll();
                break;
            case 'admin':
                if (Auth.isAdmin()) {
                    Admin.loadDashboard();
                } else {
                    Utils.showAlert('Keine Berechtigung für Admin-Bereich', 'error');
                    this.showSection('dashboard');
                }
                break;
            default:
                console.log(`No specific loader for section: ${sectionName}`);
        }
    },

    // Load dashboard data
    async loadDashboard() {
        try {
            const stats = await Utils.apiCall('/dashboard/stats');
            
            if (stats) {
                this.dashboardData = stats;
                this.displayDashboardStats(stats);
                this.displayRecentWorkouts(stats.recentWorkouts || []);
            }
        } catch (error) {
            console.error('Dashboard load error:', error);
            Utils.showAlert('Fehler beim Laden der Dashboard-Daten: ' + error.message, 'error');
        }
    },

    // Display dashboard statistics (without duration)
    displayDashboardStats(stats) {
        const elements = {
            totalWorkouts: document.getElementById('totalWorkouts'),
            thisWeekWorkouts: document.getElementById('thisWeekWorkouts'),
            currentStreak: document.getElementById('currentStreak')
        };

        if (elements.totalWorkouts) {
            elements.totalWorkouts.textContent = stats.totalWorkouts || 0;
        }
        
        if (elements.thisWeekWorkouts) {
            elements.thisWeekWorkouts.textContent = stats.thisWeekWorkouts || 0;
        }
        
        if (elements.currentStreak) {
            // Calculate streak (simplified - days with workouts in last 7 days)
            elements.currentStreak.textContent = stats.thisWeekWorkouts || 0;
        }
    },

    // Display recent workouts
    displayRecentWorkouts(workouts) {
        const container = document.getElementById('recentWorkouts');
        if (!container) return;
        
        if (workouts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #666; padding: 40px;">
                    <p>🏃‍♀️ Noch keine Trainings vorhanden</p>
                    <p style="margin-top: 10px;">
                        <button class="btn btn-success" onclick="App.showSection('newWorkout')">
                            ➕ Erstes Training erstellen
                        </button>
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = workouts.map(workout => `
            <div class="workout-item" onclick="Workouts.showDetail(${workout.id})">
                <div class="workout-date">${Utils.formatDate(workout.date)}</div>
                <div class="workout-name">${Utils.sanitizeInput(workout.name)}</div>
                ${workout.notes ? `
                    <div style="color: #666; font-size: 14px; margin-top: 5px;">
                        📝 ${Utils.sanitizeInput(workout.notes)}
                    </div>
                ` : ''}
            </div>
        `).join('');
    },

    // Refresh current section
    refresh() {
        this.loadSectionData(this.currentSection);
    },

    // Clear cached data
    clearCache() {
        this.dashboardData = null;
        Workouts.clearCache();
        Exercises.clearCache();
        Templates.clearCache();
        Admin.clearCache();
    },

    // Get dashboard data
    getDashboardData() {
        return this.dashboardData;
    },

    // Handle application errors
    handleError(error, context = 'Unknown') {
        console.error(`App Error (${context}):`, error);
        
        // Show user-friendly error message
        let message = 'Ein unerwarteter Fehler ist aufgetreten.';
        
        if (error.message) {
            if (error.message.includes('Failed to fetch')) {
                message = 'Verbindung zum Server fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung.';
            } else if (error.message.includes('401')) {
                message = 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.';
                Auth.logout();
                return;
            } else if (error.message.includes('403')) {
                message = 'Keine Berechtigung für diese Aktion.';
            } else if (error.message.includes('404')) {
                message = 'Die angeforderten Daten wurden nicht gefunden.';
            } else if (error.message.includes('500')) {
                message = 'Serverfehler. Bitte versuchen Sie es später erneut.';
            } else {
                message = error.message;
            }
        }
        
        Utils.showAlert(message, 'error');
    },

    // Show loading state
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; color: #666; padding: 40px;">
                    <div class="loading"></div>
                    <p style="margin-top: 10px;">Lädt...</p>
                </div>
            `;
        }
    },

    // Show empty state
    showEmptyState(containerId, message, actionButton = null) {
        const container = document.getElementById(containerId);
        if (container) {
            let html = `
                <div style="text-align: center; color: #666; padding: 40px;">
                    <p>${message}</p>
            `;
            
            if (actionButton) {
                html += `
                    <p style="margin-top: 10px;">
                        <button class="btn btn-success" onclick="${actionButton.action}">
                            ${actionButton.text}
                        </button>
                    </p>
                `;
            }
            
            html += '</div>';
            container.innerHTML = html;
        }
    },

    // Export user data
    async exportData() {
        try {
            Utils.showAlert('Exportiere Daten...', 'info');
            
            const [workouts, exercises, templates, profile] = await Promise.all([
                Utils.apiCall('/workouts'),
                Utils.apiCall('/exercises'),
                Utils.apiCall('/templates'),
                Utils.apiCall('/user/profile')
            ]);
            
            const exportData = {
                export_date: new Date().toISOString(),
                user: {
                    username: profile.username,
                    email: profile.email,
                    first_name: profile.first_name,
                    last_name: profile.last_name,
                    created_at: profile.created_at
                },
                workouts: workouts || [],
                exercises: exercises || [],
                templates: templates || [],
                version: '2.0'
            };
            
            const filename = `gym-tracker-export-${profile.username}-${new Date().toISOString().split('T')[0]}.json`;
            Utils.downloadJSON(exportData, filename);
            
            Utils.showAlert('Daten erfolgreich exportiert!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            Utils.showAlert('Fehler beim Exportieren der Daten: ' + error.message, 'error');
        }
    },

    // Check for updates (placeholder for future implementation)
    checkForUpdates() {
        console.log('Checking for updates...');
        // This could check a version endpoint and notify users of updates
    },

    // Get application statistics
    getAppStats() {
        return {
            currentSection: this.currentSection,
            isAuthenticated: Auth.isAuthenticated(),
            isAdmin: Auth.isAdmin(),
            user: Auth.getCurrentUser(),
            dashboardLoaded: !!this.dashboardData
        };
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});

// Handle page unload
window.addEventListener('beforeunload', function(e) {
    // Could save draft data or warn about unsaved changes
    console.log('Page unloading...');
});

// Handle online/offline status
window.addEventListener('online', function() {
    Utils.showAlert('Internetverbindung wiederhergestellt', 'success');
});

window.addEventListener('offline', function() {
    Utils.showAlert('Internetverbindung verloren', 'warning');
});
