// Übungsmodul für Gym Tracker - Vollständig optimierte Version

const Exercises = {
    // Zustandsvariablen für das Modul
    exercises: [], // Array aller geladenen Übungen
    currentExercise: null, // Aktuell bearbeitete Übung
    isEditing: false, // Flag für Bearbeitungsmodus
    editingExerciseId: null, // ID der bearbeiteten Übung
    categories: [ // Verfügbare Kategorien
        'Krafttraining',
        'Cardio', 
        'Stretching',
        'Functional'
    ],
    muscleGroups: [ // Verfügbare Muskelgruppen
        'Brust', 'Rücken', 'Schultern', 'Arme', 
        'Beine', 'Core', 'Cardio', 'Ganzkörper'
    ],

    /**
     * Initialisiert das Übungsmodul
     * Richtet Event-Listener ein und lädt initiale Daten
     */
    init() {
        console.log('Exercises: Initialisiere Übungsmodul...');
        this.setupEventListeners();
        this.createModals();
        console.log('Exercises: Modul erfolgreich initialisiert');
    },

    /**
     * Richtet alle Event-Listener für das Modul ein
     * Behandelt Formular-Submissions und Benutzerinteraktionen
     */
    setupEventListeners() {
        // Event-Listener für Übungserstellung/bearbeitung
        document.addEventListener('DOMContentLoaded', () => {
            const newExerciseForm = document.getElementById('newExerciseForm');
            if (newExerciseForm) {
                newExerciseForm.addEventListener('submit', this.handleCreateExercise.bind(this));
                console.log('Exercises: Event-Listener für Übungsformular hinzugefügt');
            }

            // Event-Listener für Übungssuche
            const searchInput = document.getElementById('exerciseSearch');
            if (searchInput) {
                searchInput.addEventListener('input', 
                    Utils.debounce(this.handleSearch.bind(this), 300)
                );
            }

            // Event-Listener für Kategorie-Filter
            const categoryFilter = document.getElementById('categoryFilter');
            if (categoryFilter) {
                categoryFilter.addEventListener('change', this.handleCategoryFilter.bind(this));
            }
        });
    },

    /**
     * Erstellt Modal-HTML für Übungsverwaltung
     * Generiert das Modal-Interface für das Erstellen/Bearbeiten von Übungen
     */
    createModals() {
        const modalHTML = `
            <!-- Modal: Neue Übung erstellen/bearbeiten -->
            <div id="newExerciseModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Neue Übung erstellen</h2>
                        <button class="close" onclick="Exercises.closeNewModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="newExerciseForm">
                            <div class="form-group">
                                <label for="exerciseName">Name der Übung *</label>
                                <input type="text" id="exerciseName" name="exerciseName" required 
                                       placeholder="z.B. Bankdrücken" maxlength="100">
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="exerciseCategory">Kategorie *</label>
                                    <select id="exerciseCategory" name="exerciseCategory" required>
                                        <option value="">-- Wählen Sie eine Kategorie --</option>
                                        ${this.categories.map(cat => 
                                            `<option value="${cat}">${cat}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="exerciseMuscleGroup">Muskelgruppe *</label>
                                    <select id="exerciseMuscleGroup" name="exerciseMuscleGroup" required>
                                        <option value="">-- Wählen Sie eine Muskelgruppe --</option>
                                        ${this.muscleGroups.map(muscle => 
                                            `<option value="${muscle}">${muscle}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="exerciseDescription">Beschreibung</label>
                                <textarea id="exerciseDescription" name="exerciseDescription" 
                                         placeholder="Kurze Beschreibung der Übung..." maxlength="500"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="exerciseInstructions">Ausführungsanleitung</label>
                                <textarea id="exerciseInstructions" name="exerciseInstructions" 
                                         placeholder="Detaillierte Anleitung zur korrekten Ausführung..." maxlength="1000"></textarea>
                            </div>
                            
                            <div id="exerciseFormAlert"></div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-success">
                                    <span id="exerciseSubmitText">Übung speichern</span>
                                    <div id="exerciseSubmitLoading" class="loading hidden"></div>
                                </button>
                                <button type="button" class="btn btn-outline" onclick="Exercises.closeNewModal()">
                                    Abbrechen
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Modal zum DOM hinzufügen
        let container = document.getElementById('modals-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modals-container';
            document.body.appendChild(container);
        }
        container.innerHTML += modalHTML;
        console.log('Exercises: Modal-HTML erstellt');
    },

    /**
     * Lädt alle Übungen vom Server
     * Aktualisiert lokalen Cache und Dropdown-Auswahlmenüs
     * @returns {Promise<Array>} Array der geladenen Übungen
     */
    async loadAll() {
        try {
            console.log('Exercises: Lade alle Übungen...');
            const exercises = await Utils.apiCall('/exercises');
            this.exercises = exercises || [];
            this.updateExerciseSelect();
            console.log(`Exercises: ${this.exercises.length} Übungen geladen`);
            return this.exercises;
        } catch (error) {
            console.error('Exercises: Fehler beim Laden der Übungen:', error);
            this.exercises = [];
            Utils.showAlert('Fehler beim Laden der Übungen: ' + error.message, 'error');
            return [];
        }
    },

    /**
     * Lädt und zeigt Übungsliste für die Übungssektion an
     * Behandelt Ladezustände und Fehlerbehandlung
     */
    async loadList() {
        try {
            console.log('Exercises: Lade Übungsliste für Anzeige...');
            
            // Ladezustand anzeigen
            App.showLoading('exercisesList');
            
            // Übungen laden
            const exercises = await this.loadAll();
            
            // Anzeige aktualisieren
            this.displayExercisesList(exercises);
            
            console.log('Exercises: Liste erfolgreich angezeigt');
        } catch (error) {
            console.error('Exercises: Fehler beim Laden der Liste:', error);
            Utils.showAlert('Fehler beim Laden der Übungen: ' + error.message, 'error');
            this.displayExercisesList([]);
        }
    },

    /**
     * Zeigt Übungsliste gruppiert nach Kategorien an
     * Erstellt HTML-Struktur für die Anzeige aller Übungen
     * @param {Array} exercises Array der anzuzeigenden Übungen
     */
    displayExercisesList(exercises) {
        const container = document.getElementById('exercisesList');
        if (!container) {
            console.error('Exercises: Container exercisesList nicht gefunden');
            return;
        }
        
        // Leerzustand behandeln
        if (exercises.length === 0) {
            App.showEmptyState('exercisesList',
                'Noch keine Übungen vorhanden',
                {
                    text: 'Erste Übung erstellen',
                    action: 'Exercises.showNewModal()'
                }
            );
            return;
        }

        // Such- und Filterleiste hinzufügen
        const filterHTML = `
            <div style="margin-bottom: 30px; display: flex; gap: 15px; flex-wrap: wrap;">
                <div class="form-group" style="flex: 1; min-width: 200px;">
                    <input type="text" id="exerciseSearch" placeholder="Übungen durchsuchen..." 
                           style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                </div>
                <div class="form-group">
                    <select id="categoryFilter" style="padding: 10px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                        <option value="">Alle Kategorien</option>
                        ${this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                </div>
                <button class="btn btn-success" onclick="Exercises.showNewModal()">
                    ➕ Neue Übung
                </button>
            </div>
        `;

        // Übungen nach Kategorie gruppieren
        const groupedExercises = exercises.reduce((groups, exercise) => {
            const category = exercise.category || 'Sonstige';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(exercise);
            return groups;
        }, {});

        // HTML für jede Kategorie generieren
        const exercisesHTML = Object.keys(groupedExercises)
            .sort() // Kategorien alphabetisch sortieren
            .map(category => `
                <div class="exercise-category" style="margin-bottom: 40px;">
                    <h3 style="color: var(--accent-primary); margin-bottom: 20px; border-bottom: 2px solid var(--accent-primary); padding-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                        ${this.getCategoryIcon(category)}
                        ${Utils.sanitizeInput(category)}
                        <span style="font-size: 14px; background: var(--accent-primary); color: white; padding: 2px 8px; border-radius: 12px;">
                            ${groupedExercises[category].length}
                        </span>
                    </h3>
                    <div class="exercises-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">
                        ${groupedExercises[category].map(exercise => this.createExerciseCard(exercise)).join('')}
                    </div>
                </div>
            `).join('');

        container.innerHTML = filterHTML + exercisesHTML;

        // Event-Listener für Such- und Filterfunktionen einrichten
        this.setupFilterListeners();
    },

    /**
     * Erstellt HTML-Karte für eine einzelne Übung
     * Generiert formatierte Anzeige mit Aktionsbuttons
     * @param {Object} exercise Übungsobjekt
     * @returns {string} HTML-String für die Übungskarte
     */
    createExerciseCard(exercise) {
        return `
            <div class="exercise-card" style="background: var(--bg-secondary); border-radius: var(--radius-lg); padding: 20px; border: 1px solid var(--border-color); transition: transform 0.2s;">
                <div class="exercise-header" style="margin-bottom: 15px;">
                    <h4 style="color: var(--text-primary); margin: 0 0 8px 0; font-size: 18px;">
                        ${Utils.sanitizeInput(exercise.name)}
                    </h4>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <span class="exercise-tag" style="background: var(--accent-primary); color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                            ${Utils.sanitizeInput(exercise.muscle_group)}
                        </span>
                        ${exercise.difficulty_level ? `
                            <span class="difficulty-tag" style="background: ${this.getDifficultyColor(exercise.difficulty_level)}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                                ${this.getDifficultyText(exercise.difficulty_level)}
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                ${exercise.description ? `
                    <div class="exercise-description" style="color: var(--text-secondary); margin-bottom: 15px; font-size: 14px; line-height: 1.4;">
                        ${Utils.sanitizeInput(exercise.description)}
                    </div>
                ` : ''}
                
                ${exercise.instructions ? `
                    <div class="exercise-instructions" style="margin-bottom: 15px;">
                        <strong style="color: var(--text-primary); font-size: 13px;">Ausführung:</strong>
                        <p style="color: var(--text-secondary); font-size: 13px; margin: 5px 0 0 0; line-height: 1.3;">
                            ${Utils.sanitizeInput(exercise.instructions)}
                        </p>
                    </div>
                ` : ''}
                
                <div class="exercise-actions" style="display: flex; gap: 8px; margin-top: 15px;">
                    <button class="btn btn-outline" onclick="Exercises.editExercise(${exercise.id})" 
                            style="flex: 1; padding: 8px 12px; font-size: 13px;" title="Übung bearbeiten">
                        ✏️ Bearbeiten
                    </button>
                    <button class="btn btn-danger" onclick="Exercises.deleteExercise(${exercise.id})" 
                            style="flex: 1; padding: 8px 12px; font-size: 13px;" title="Übung löschen">
                        🗑️ Löschen
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Richtet Event-Listener für Such- und Filterfunktionen ein
     * Aktiviert Echtzeitsuche und Kategoriefilterung
     */
    setupFilterListeners() {
        const searchInput = document.getElementById('exerciseSearch');
        const categoryFilter = document.getElementById('categoryFilter');

        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(() => {
                this.applyFilters();
            }, 300));
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }
    },

    /**
     * Wendet Such- und Kategoriefilter auf die Übungsliste an
     * Filtert angezeigte Übungen basierend auf Benutzereingaben
     */
    applyFilters() {
        const searchQuery = document.getElementById('exerciseSearch')?.value?.toLowerCase() || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';

        let filteredExercises = this.exercises;

        // Suchfilter anwenden
        if (searchQuery) {
            filteredExercises = filteredExercises.filter(exercise =>
                exercise.name.toLowerCase().includes(searchQuery) ||
                exercise.muscle_group.toLowerCase().includes(searchQuery) ||
                (exercise.description && exercise.description.toLowerCase().includes(searchQuery)) ||
                (exercise.instructions && exercise.instructions.toLowerCase().includes(searchQuery))
            );
        }

        // Kategoriefilter anwenden
        if (categoryFilter) {
            filteredExercises = filteredExercises.filter(exercise =>
                exercise.category === categoryFilter
            );
        }

        // Gefilterte Liste anzeigen
        this.displayFilteredExercises(filteredExercises, searchQuery, categoryFilter);
    },

    /**
     * Zeigt gefilterte Übungsliste an
     * @param {Array} exercises Gefilterte Übungen
     * @param {string} searchQuery Aktueller Suchbegriff
     * @param {string} categoryFilter Aktueller Kategoriefilter
     */
    displayFilteredExercises(exercises, searchQuery, categoryFilter) {
        const container = document.getElementById('exercisesList');
        if (!container) return;

        // Filter-Info anzeigen
        let filterInfo = '';
        if (searchQuery || categoryFilter) {
            const filters = [];
            if (searchQuery) filters.push(`"${searchQuery}"`);
            if (categoryFilter) filters.push(`Kategorie: ${categoryFilter}`);
            
            filterInfo = `
                <div style="background: var(--bg-secondary); padding: 15px; border-radius: var(--radius-md); margin-bottom: 20px; border-left: 4px solid var(--accent-primary);">
                    <strong>Filter aktiv:</strong> ${filters.join(', ')} 
                    <span style="color: var(--accent-primary);">(${exercises.length} von ${this.exercises.length} Übungen)</span>
                    <button onclick="Exercises.clearFilters()" style="margin-left: 15px; background: none; border: none; color: var(--accent-primary); text-decoration: underline; cursor: pointer;">
                        Filter zurücksetzen
                    </button>
                </div>
            `;
        }

        if (exercises.length === 0) {
            container.innerHTML = container.innerHTML.split('<div class="exercise-category"')[0] + `
                ${filterInfo}
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <h3>Keine Übungen gefunden</h3>
                    <p>Versuchen Sie andere Suchbegriffe oder erstellen Sie eine neue Übung.</p>
                    <button class="btn btn-success" onclick="Exercises.showNewModal()" style="margin-top: 15px;">
                        ➕ Neue Übung erstellen
                    </button>
                </div>
            `;
            return;
        }

        // Gruppierte Anzeige für gefilterte Ergebnisse
        const groupedExercises = exercises.reduce((groups, exercise) => {
            const category = exercise.category || 'Sonstige';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(exercise);
            return groups;
        }, {});

        const exercisesHTML = Object.keys(groupedExercises)
            .sort()
            .map(category => `
                <div class="exercise-category" style="margin-bottom: 40px;">
                    <h3 style="color: var(--accent-primary); margin-bottom: 20px; border-bottom: 2px solid var(--accent-primary); padding-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                        ${this.getCategoryIcon(category)}
                        ${Utils.sanitizeInput(category)}
                        <span style="font-size: 14px; background: var(--accent-primary); color: white; padding: 2px 8px; border-radius: 12px;">
                            ${groupedExercises[category].length}
                        </span>
                    </h3>
                    <div class="exercises-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">
                        ${groupedExercises[category].map(exercise => this.createExerciseCard(exercise)).join('')}
                    </div>
                </div>
            `).join('');

        // Container-Inhalt ab den Übungskategorien ersetzen
        const containerContent = container.innerHTML.split('<div class="exercise-category"')[0];
        container.innerHTML = containerContent + filterInfo + exercisesHTML;
    },

    /**
     * Setzt alle Filter zurück und zeigt vollständige Liste an
     */
    clearFilters() {
        const searchInput = document.getElementById('exerciseSearch');
        const categoryFilter = document.getElementById('categoryFilter');

        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';

        this.displayExercisesList(this.exercises);
    },

    /**
     * Aktualisiert Dropdown-Auswahl für Übungen in anderen Modulen
     * Befüllt Select-Elemente mit aktuellen Übungen
     */
    updateExerciseSelect() {
        const selects = [
            'exerciseSelect', // Für Workout-Erstellung
            'templateExerciseSelect' // Für Template-Erstellung
        ];

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">-- Übung auswählen --</option>';
                
                this.exercises.forEach(exercise => {
                    const option = document.createElement('option');
                    option.value = exercise.id;
                    option.textContent = `${exercise.name} (${exercise.muscle_group})`;
                    select.appendChild(option);
                });
            }
        });

        console.log('Exercises: Dropdown-Menüs aktualisiert');
    },

    /**
     * Zeigt Modal für neue Übungserstellung an
     * Setzt Formular zurück und öffnet das Modal
     */
    showNewModal() {
        console.log('Exercises: Öffne Modal für neue Übung');
        this.resetForm();
        const modal = document.getElementById('newExerciseModal');
        if (modal) {
            modal.style.display = 'block';
        } else {
            console.error('Exercises: Modal newExerciseModal nicht gefunden');
        }
    },

    /**
     * Schließt Modal für Übungserstellung
     * Versteckt Modal und setzt Zustand zurück
     */
    closeNewModal() {
        console.log('Exercises: Schließe Übungsmodal');
        const modal = document.getElementById('newExerciseModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.resetForm();
    },

    /**
     * Setzt Übungsformular komplett zurück
     * Löscht alle Eingaben und setzt Bearbeitungsflags zurück
     */
    resetForm() {
        const form = document.getElementById('newExerciseForm');
        if (form) {
            form.reset();
        }
        
        // Zustand zurücksetzen
        this.isEditing = false;
        this.editingExerciseId = null;
        this.currentExercise = null;
        
        // Modal-Titel und Button zurücksetzen
        const modalTitle = document.querySelector('#newExerciseModal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Neue Übung erstellen';
        }
        
        const submitButton = document.getElementById('exerciseSubmitText');
        if (submitButton) {
            submitButton.textContent = 'Übung speichern';
        }

        // Alert-Container leeren
        const alertContainer = document.getElementById('exerciseFormAlert');
        if (alertContainer) {
            alertContainer.innerHTML = '';
        }
        
        console.log('Exercises: Formular zurückgesetzt');
    },

    /**
     * Lädt Übung zur Bearbeitung und öffnet Modal
     * Befüllt Formular mit vorhandenen Übungsdaten
     * @param {number} exerciseId ID der zu bearbeitenden Übung
     */
    async editExercise(exerciseId) {
        try {
            console.log(`Exercises: Lade Übung ${exerciseId} zur Bearbeitung`);
            
            // Übung laden (erst lokal suchen, dann vom Server)
            let exercise = this.getById(exerciseId);
            if (!exercise) {
                exercise = await Utils.apiCall(`/exercises/${exerciseId}`);
            }
            
            if (!exercise) {
                throw new Error('Übung nicht gefunden');
            }
            
            // Bearbeitungsmodus aktivieren
            this.isEditing = true;
            this.editingExerciseId = exerciseId;
            this.currentExercise = exercise;
            
            // Formular mit Übungsdaten befüllen
            const fields = {
                exerciseName: exercise.name,
                exerciseCategory: exercise.category,
                exerciseMuscleGroup: exercise.muscle_group,
                exerciseDescription: exercise.description || '',
                exerciseInstructions: exercise.instructions || ''
            };

            Object.entries(fields).forEach(([fieldId, value]) => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.value = value;
                }
            });
            
            // Modal-Titel und Button aktualisieren
            const modalTitle = document.querySelector('#newExerciseModal .modal-title');
            if (modalTitle) {
                modalTitle.textContent = `Übung bearbeiten: ${exercise.name}`;
            }
            
            const submitText = document.getElementById('exerciseSubmitText');
            if (submitText) {
                submitText.textContent = 'Übung aktualisieren';
            }
            
            // Modal anzeigen
            const modal = document.getElementById('newExerciseModal');
            if (modal) {
                modal.style.display = 'block';
            }
            
            console.log('Exercises: Übung erfolgreich zur Bearbeitung geladen');
            
        } catch (error) {
            console.error('Exercises: Fehler beim Laden der Übung:', error);
            Utils.showAlert('Fehler beim Laden der Übung: ' + error.message, 'error');
        }
    },

    /**
     * Löscht eine Übung nach Bestätigung
     * Führt Sicherheitsabfrage durch und löscht bei Bestätigung
     * @param {number} exerciseId ID der zu löschenden Übung
     */
    async deleteExercise(exerciseId) {
        const exercise = this.getById(exerciseId);
        const exerciseName = exercise ? exercise.name : 'diese Übung';
        
        // Sicherheitsabfrage
        if (!confirm(`Sind Sie sicher, dass Sie "${exerciseName}" löschen möchten?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`)) {
            return;
        }

        try {
            console.log(`Exercises: Lösche Übung ${exerciseId}`);
            
            await Utils.apiCall(`/exercises/${exerciseId}`, {
                method: 'DELETE'
            });
            
            Utils.showAlert('Übung erfolgreich gelöscht!', 'success');
            
            // Übungen neu laden und Anzeige aktualisieren
            await this.loadAll();
            
            // Aktuelle Ansicht aktualisieren falls auf Übungsseite
            if (App.currentSection === 'exercises') {
                this.loadList();
            }
            
            console.log('Exercises: Übung erfolgreich gelöscht');
            
        } catch (error) {
            console.error('Exercises: Fehler beim Löschen:', error);
            Utils.showAlert('Fehler beim Löschen der Übung: ' + error.message, 'error');
        }
    },

    /**
     * Behandelt Übungserstellung und -aktualisierung
     * Verarbeitet Formular-Submission und sendet Daten an Server
     * @param {Event} e Form-Submit-Event
     */
    async handleCreateExercise(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const submitText = document.getElementById('exerciseSubmitText');
        const submitLoading = document.getElementById('exerciseSubmitLoading');
        const alertContainer = document.getElementById('exerciseFormAlert');
        
        // UI-Zustand für Ladeanzeige setzen
        const originalText = submitText.textContent;
        
        try {
            // Button-Zustand während Request ändern
            submitButton.disabled = true;
            submitText.classList.add('hidden');
            submitLoading.classList.remove('hidden');
            
            // Alert-Container leeren
            if (alertContainer) {
                alertContainer.innerHTML = '';
            }
            
            // Formulardaten sammeln und validieren
            const exerciseData = this.collectFormData();
            const validationErrors = this.validateExerciseData(exerciseData);
            
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join('\n'));
            }

            console.log('Exercises: Speichere Übung:', exerciseData);

            let response;
            let successMessage;

            if (this.isEditing && this.editingExerciseId) {
                // Bestehende Übung aktualisieren
                response = await Utils.apiCall(`/exercises/${this.editingExerciseId}`, {
                    method: 'PUT',
                    body: JSON.stringify(exerciseData)
                });
                successMessage = 'Übung erfolgreich aktualisiert!';
                console.log('Exercises: Übung aktualisiert');
            } else {
                // Neue Übung erstellen
                response = await Utils.apiCall('/exercises', {
                    method: 'POST',
                    body: JSON.stringify(exerciseData)
                });
                successMessage = 'Übung erfolgreich erstellt!';
                console.log('Exercises: Neue Übung erstellt');
            }

            // Erfolg anzeigen und aufräumen
            Utils.showAlert(successMessage, 'success');
            this.closeNewModal();
            
            // Übungen neu laden
            await this.loadAll();
            
            // Aktuelle Ansicht aktualisieren falls auf Übungsseite
            if (App.currentSection === 'exercises') {
                this.loadList();
            }

            return response;
        } catch (error) {
            console.error('Exercises: Fehler beim Speichern:', error);
            
            // Fehler im Modal anzeigen
            if (alertContainer) {
                alertContainer.innerHTML = `
                    <div class="alert alert-error" style="margin-top: 15px;">
                        ${error.message.replace(/\n/g, '<br>')}
                    </div>
                `;
            } else {
                Utils.showAlert('Fehler beim Speichern der Übung: ' + error.message, 'error');
            }
            
            throw error;
        } finally {
            // Button-Zustand zurücksetzen
            submitButton.disabled = false;
            submitText.classList.remove('hidden');
            submitLoading.classList.add('hidden');
            submitText.textContent = originalText;
        }
    },

    /**
     * Sammelt und bereinigt Formulardaten
     * Extrahiert alle Werte aus dem Übungsformular
     * @returns {Object} Bereinigte Übungsdaten
     */
    collectFormData() {
        return {
            name: document.getElementById('exerciseName').value.trim(),
            category: document.getElementById('exerciseCategory').value,
            muscle_group: document.getElementById('exerciseMuscleGroup').value,
            description: document.getElementById('exerciseDescription').value.trim() || null,
            instructions: document.getElementById('exerciseInstructions').value.trim() || null
        };
    },

    /**
     * Validiert Übungsdaten vor dem Speichern
     * Überprüft alle erforderlichen Felder und Datentypen
     * @param {Object} data Zu validierende Übungsdaten
     * @returns {string[]} Array von Fehlermeldungen (leer bei Erfolg)
     */
    validateExerciseData(data) {
        const errors = [];
        
        // Name validieren
        if (!data.name || data.name.length < 2) {
            errors.push('Name muss mindestens 2 Zeichen lang sein');
        }
        if (data.name && data.name.length > 100) {
            errors.push('Name darf maximal 100 Zeichen lang sein');
        }
        
        // Kategorie validieren
        if (!data.category) {
            errors.push('Kategorie ist erforderlich');
        } else if (!this.categories.includes(data.category)) {
            errors.push('Ungültige Kategorie ausgewählt');
        }
        
        // Muskelgruppe validieren
        if (!data.muscle_group) {
            errors.push('Muskelgruppe ist erforderlich');
        } else if (!this.muscleGroups.includes(data.muscle_group)) {
            errors.push('Ungültige Muskelgruppe ausgewählt');
        }
        
        // Optionale Felder validieren
        if (data.description && data.description.length > 500) {
            errors.push('Beschreibung darf maximal 500 Zeichen lang sein');
        }
        
        if (data.instructions && data.instructions.length > 1000) {
            errors.push('Ausführungsanleitung darf maximal 1000 Zeichen lang sein');
        }
        
        // Doppelte Übungen prüfen (nur bei Neuerstellung)
        if (!this.isEditing) {
            const existingExercise = this.exercises.find(ex => 
                ex.name.toLowerCase() === data.name.toLowerCase() &&
                ex.category === data.category &&
                ex.muscle_group === data.muscle_group
            );
            
            if (existingExercise) {
                errors.push('Eine Übung mit diesem Namen, Kategorie und Muskelgruppe existiert bereits');
            }
        }
        
        return errors;
    },

    /**
     * Schnelle Übungserstellung für Workout-/Template-Workflow
     * Erstellt Übung direkt aus anderem Kontext heraus
     * @param {string} containerId ID des Containers mit Quick-Add-Feldern
     * @returns {Promise<Object>} Erstellte Übung
     */
    async quickAdd(containerId = '') {
        const prefix = containerId ? containerId : 'quick';
        const nameId = `${prefix}ExerciseName`;
        const categoryId = `${prefix}ExerciseCategory`;
        const muscleId = `${prefix}ExerciseMuscle`;
        
        const name = document.getElementById(nameId)?.value?.trim();
        const category = document.getElementById(categoryId)?.value;
        const muscle_group = document.getElementById(muscleId)?.value;
        
        if (!name || !category || !muscle_group) {
            Utils.showAlert('Bitte alle Felder für die neue Übung ausfüllen', 'warning');
            return null;
        }
        
        try {
            console.log('Exercises: Quick-Add für Übung:', { name, category, muscle_group });
            
            const exerciseData = {
                name,
                category,
                muscle_group,
                description: null,
                instructions: null
            };
            
            const response = await Utils.apiCall('/exercises', {
                method: 'POST',
                body: JSON.stringify(exerciseData)
            });
            
            if (response && response.exerciseId) {
                // Übungen neu laden
                await this.loadAll();
                
                // Quick-Add-Felder zurücksetzen
                [nameId, categoryId, muscleId].forEach(id => {
                    const field = document.getElementById(id);
                    if (field) field.value = '';
                });
                
                const newExercise = {
                    id: response.exerciseId,
                    name,
                    category,
                    muscle_group
                };
                
                Utils.showAlert('Übung erstellt und verfügbar!', 'success');
                console.log('Exercises: Quick-Add erfolgreich');
                
                return newExercise;
            }
        } catch (error) {
            console.error('Exercises: Quick-Add-Fehler:', error);
            Utils.showAlert('Fehler beim Erstellen der Übung: ' + error.message, 'error');
            return null;
        }
    },

    /**
     * Gibt Übung nach ID zurück
     * Sucht in lokalem Cache nach Übung
     * @param {number} exerciseId Übungs-ID
     * @returns {Object|undefined} Übungs-Objekt oder undefined
     */
    getById(exerciseId) {
        return this.exercises.find(ex => ex.id === parseInt(exerciseId));
    },

    /**
     * Gibt Übungen nach Kategorie zurück
     * Filtert lokale Übungen nach Kategorie
     * @param {string} category Kategorie-Name
     * @returns {Array} Array der gefilterten Übungen
     */
    getByCategory(category) {
        return this.exercises.filter(ex => ex.category === category);
    },

    /**
     * Gibt Übungen nach Muskelgruppe zurück
     * Filtert lokale Übungen nach Muskelgruppe
     * @param {string} muscleGroup Muskelgruppen-Name
     * @returns {Array} Array der gefilterten Übungen
     */
    getByMuscleGroup(muscleGroup) {
        return this.exercises.filter(ex => ex.muscle_group === muscleGroup);
    },

    /**
     * Durchsucht Übungen nach Suchbegriff
     * Führt Volltextsuche über alle Übungsfelder durch
     * @param {string} query Suchbegriff
     * @returns {Array} Array der gefundenen Übungen
     */
    search(query) {
        if (!query || query.length < 2) return this.exercises;
        
        const lowerQuery = query.toLowerCase();
        return this.exercises.filter(ex => 
            ex.name.toLowerCase().includes(lowerQuery) ||
            ex.category.toLowerCase().includes(lowerQuery) ||
            ex.muscle_group.toLowerCase().includes(lowerQuery) ||
            (ex.description && ex.description.toLowerCase().includes(lowerQuery)) ||
            (ex.instructions && ex.instructions.toLowerCase().includes(lowerQuery))
        );
    },

    /**
     * Gibt detaillierte Übungsstatistiken zurück
     * Berechnet verschiedene Metriken über alle Übungen
     * @returns {Object|null} Statistik-Objekt oder null bei leerer Liste
     */
    getExerciseStats() {
        if (!this.exercises.length) return null;

        // Kategorien-Statistiken berechnen
        const categoryStats = this.exercises.reduce((stats, ex) => {
            stats[ex.category] = (stats[ex.category] || 0) + 1;
            return stats;
        }, {});

        // Muskelgruppen-Statistiken berechnen
        const muscleGroupStats = this.exercises.reduce((stats, ex) => {
            stats[ex.muscle_group] = (stats[ex.muscle_group] || 0) + 1;
            return stats;
        }, {});

        // Beliebteste Kategorie und Muskelgruppe ermitteln
        const mostPopularCategory = Object.keys(categoryStats).reduce((a, b) => 
            categoryStats[a] > categoryStats[b] ? a : b
        );
        
        const mostPopularMuscleGroup = Object.keys(muscleGroupStats).reduce((a, b) => 
            muscleGroupStats[a] > muscleGroupStats[b] ? a : b
        );

        return {
            total: this.exercises.length,
            categories: categoryStats,
            muscleGroups: muscleGroupStats,
            mostPopularCategory,
            mostPopularMuscleGroup,
            categoriesCount: Object.keys(categoryStats).length,
            muscleGroupsCount: Object.keys(muscleGroupStats).length
        };
    },

    /**
     * Exportiert alle Übungen als JSON-Datei
     * Lädt Übungsdaten für Benutzer herunter
     */
    exportExercises() {
        if (!this.exercises.length) {
            Utils.showAlert('Keine Übungen zum Exportieren vorhanden', 'warning');
            return;
        }

        const exportData = {
            export_date: new Date().toISOString(),
            exercise_count: this.exercises.length,
            exercises: this.exercises.map(ex => ({
                name: ex.name,
                category: ex.category,
                muscle_group: ex.muscle_group,
                description: ex.description,
                instructions: ex.instructions
            }))
        };

        const filename = `gym-tracker-exercises-${new Date().toISOString().split('T')[0]}.json`;
        Utils.downloadJSON(exportData, filename);
        Utils.showAlert(`${this.exercises.length} Übungen exportiert`, 'success');
        
        console.log('Exercises: Export abgeschlossen:', filename);
    },

    /**
     * Importiert Übungen aus JSON-Daten
     * Verarbeitet hochgeladene Übungsdaten
     * @param {Array} exercisesData Array von Übungsdaten
     * @returns {Promise<Object>} Import-Ergebnis mit Statistiken
     */
    async importExercises(exercisesData) {
        if (!Array.isArray(exercisesData)) {
            throw new Error('Ungültiges Datenformat - Array erwartet');
        }

        console.log(`Exercises: Importiere ${exercisesData.length} Übungen...`);

        let imported = 0;
        let errors = 0;
        let skipped = 0;
        const errorDetails = [];

        // Jede Übung einzeln verarbeiten
        for (let i = 0; i < exercisesData.length; i++) {
            const exerciseData = exercisesData[i];
            
            try {
                // Datenvalidierung
                const validationErrors = this.validateExerciseData(exerciseData);
                if (validationErrors.length > 0) {
                    errorDetails.push(`Übung ${i + 1}: ${validationErrors.join(', ')}`);
                    errors++;
                    continue;
                }

                // Duplikat-Prüfung
                const isDuplicate = this.exercises.some(existing =>
                    existing.name.toLowerCase() === exerciseData.name.toLowerCase() &&
                    existing.category === exerciseData.category &&
                    existing.muscle_group === exerciseData.muscle_group
                );

                if (isDuplicate) {
                    skipped++;
                    continue;
                }

                // Übung erstellen
                await Utils.apiCall('/exercises', {
                    method: 'POST',
                    body: JSON.stringify(exerciseData)
                });
                imported++;
                
            } catch (error) {
                errorDetails.push(`Übung ${i + 1}: ${error.message}`);
                errors++;
            }
        }

        // Übungen neu laden
        await this.loadAll();
        
        // Aktuelle Ansicht aktualisieren
        if (App.currentSection === 'exercises') {
            this.loadList();
        }

        const result = {
            imported,
            errors,
            skipped,
            total: exercisesData.length,
            errorDetails
        };

        // Ergebnis-Nachricht erstellen
        let message = `Import abgeschlossen: ${imported} erfolgreich`;
        if (skipped > 0) message += `, ${skipped} übersprungen (Duplikate)`;
        if (errors > 0) message += `, ${errors} Fehler`;

        const alertType = errors > imported ? 'error' : errors > 0 ? 'warning' : 'success';
        Utils.showAlert(message, alertType);

        console.log('Exercises: Import-Ergebnis:', result);
        return result;
    },

    /**
     * Löscht alle zwischengespeicherten Daten
     * Setzt Modul in Ausgangszustand zurück
     */
    clearCache() {
        this.exercises = [];
        this.currentExercise = null;
        this.isEditing = false;
        this.editingExerciseId = null;
        console.log('Exercises: Cache geleert');
    },

    /**
     * Gibt alle Übungsdaten zurück
     * Zugriff auf lokalen Übungs-Cache
     * @returns {Array} Array aller geladenen Übungen
     */
    getExercises() {
        return this.exercises;
    },

    /**
     * Filtert Übungen für Dropdown-Auswahl
     * Ermöglicht gefilterte Anzeige in Select-Elementen
     * @param {string|null} category Kategorie-Filter (optional)
     * @param {string|null} muscleGroup Muskelgruppen-Filter (optional)
     * @returns {Array} Gefilterte Übungen
     */
    filterForSelect(category = null, muscleGroup = null) {
        let filtered = this.exercises;
        
        if (category) {
            filtered = filtered.filter(ex => ex.category === category);
        }
        
        if (muscleGroup) {
            filtered = filtered.filter(ex => ex.muscle_group === muscleGroup);
        }
        
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    },

    /**
     * Gibt Icon für Kategorie zurück
     * Liefert passendes Emoji/Icon für Übungskategorie
     * @param {string} category Kategorie-Name
     * @returns {string} Icon/Emoji
     */
    getCategoryIcon(category) {
        const icons = {
            'Krafttraining': '💪',
            'Cardio': '🏃',
            'Stretching': '🤸',
            'Functional': '🏋️',
            'Sonstige': '📋'
        };
        return icons[category] || '📋';
    },

    /**
     * Gibt Farbe für Schwierigkeitsgrad zurück
     * Liefert CSS-Farbe basierend auf Schwierigkeitslevel
     * @param {number} level Schwierigkeitslevel (1-5)
     * @returns {string} CSS-Farbwert
     */
    getDifficultyColor(level) {
        const colors = {
            1: '#28a745', // Grün - Einfach
            2: '#20c997', // Teal - Leicht
            3: '#ffc107', // Gelb - Mittel
            4: '#fd7e14', // Orange - Schwer
            5: '#dc3545'  // Rot - Sehr schwer
        };
        return colors[level] || '#6c757d';
    },

    /**
     * Gibt Text für Schwierigkeitsgrad zurück
     * Liefert beschreibenden Text für Schwierigkeitslevel
     * @param {number} level Schwierigkeitslevel (1-5)
     * @returns {string} Beschreibender Text
     */
    getDifficultyText(level) {
        const texts = {
            1: 'Einfach',
            2: 'Leicht',
            3: 'Mittel',
            4: 'Schwer',
            5: 'Sehr schwer'
        };
        return texts[level] || 'Unbekannt';
    },

    /**
     * Führt Wartungsoperationen durch
     * Optimiert Datenstrukturen und prüft Konsistenz
     */
    async performMaintenance() {
        console.log('Exercises: Führe Wartung durch...');
        
        try {
            // Doppelte Übungen identifizieren
            const duplicates = this.findDuplicates();
            if (duplicates.length > 0) {
                console.warn(`Exercises: ${duplicates.length} mögliche Duplikate gefunden`);
            }
            
            // Übungen ohne Kategorie/Muskelgruppe finden
            const incomplete = this.exercises.filter(ex => 
                !ex.category || !ex.muscle_group || !ex.name
            );
            
            if (incomplete.length > 0) {
                console.warn(`Exercises: ${incomplete.length} unvollständige Übungen gefunden`);
            }
            
            // Cache aktualisieren
            await this.loadAll();
            
            console.log('Exercises: Wartung abgeschlossen');
            return {
                duplicates: duplicates.length,
                incomplete: incomplete.length,
                total: this.exercises.length
            };
            
        } catch (error) {
            console.error('Exercises: Wartungsfehler:', error);
            throw error;
        }
    },

    /**
     * Findet potentielle Duplikate in Übungsliste
     * Identifiziert Übungen mit ähnlichen Namen/Eigenschaften
     * @returns {Array} Array von Duplikat-Gruppen
     */
    findDuplicates() {
        const duplicates = [];
        const seen = new Map();
        
        this.exercises.forEach(exercise => {
            const key = `${exercise.name.toLowerCase()}-${exercise.category}-${exercise.muscle_group}`;
            
            if (seen.has(key)) {
                duplicates.push({
                    original: seen.get(key),
                    duplicate: exercise
                });
            } else {
                seen.set(key, exercise);
            }
        });
        
        return duplicates;
    },

    /**
     * Validiert Modullzustand
     * Überprüft interne Konsistenz des Moduls
     * @returns {boolean} True wenn alles konsistent ist
     */
    validateState() {
        const issues = [];
        
        // Prüfe ob exercises Array gültig ist
        if (!Array.isArray(this.exercises)) {
            issues.push('exercises ist kein Array');
        }
        
        // Prüfe Bearbeitungszustand
        if (this.isEditing && !this.editingExerciseId) {
            issues.push('Bearbeitungsmodus aktiv aber keine ID gesetzt');
        }
        
        if (this.editingExerciseId && !this.isEditing) {
            issues.push('Bearbeitungs-ID gesetzt aber Modus inaktiv');
        }
        
        // Prüfe currentExercise
        if (this.isEditing && !this.currentExercise) {
            issues.push('Bearbeitungsmodus aktiv aber keine aktuelle Übung');
        }
        
        if (issues.length > 0) {
            console.warn('Exercises: Zustandsprobleme gefunden:', issues);
            return false;
        }
        
        return true;
    }
};