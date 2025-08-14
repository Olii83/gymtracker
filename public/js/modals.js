// Modals-Modul für Gym Tracker - Optimierte und zentrale Verwaltung
// Dieses Modul bietet eine zentrale Schnittstelle für die Verwaltung aller Modal-Fenster.

const Modals = {
    // Zustandsvariablen
    activeModals: new Set(),
    modalStack: [],
    baseZIndex: 1050,
    
    /**
     * Initialisiert das Modal-System.
     */
    init() {
        console.log('Modals: Initialisiere Modal-System...');
        this.createModalAnimations();
        this.createConfirmationModal();
        this.setupGlobalListeners();
        console.log('Modals: System erfolgreich initialisiert');
    },

    /**
     * Richtet globale Event-Listener für das Schließen von Modals ein.
     */
    setupGlobalListeners() {
        window.addEventListener('click', (event) => {
            // Schließe Modals bei Klick außerhalb des Modal-Inhalts
            if (event.target.classList.contains('modal')) {
                this.closeModal(event.target.id);
            }
        });

        // Schließe Modals mit der Escape-Taste
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalStack.length > 0) {
                const topModalId = this.modalStack[this.modalStack.length - 1];
                this.closeModal(topModalId);
            }
        });
    },

    /**
     * Zeigt ein Modal an.
     * @param {string} modalId - Die ID des Modal-Elements.
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modals: Modal mit ID "${modalId}" nicht gefunden.`);
            return;
        }

        // Animation und Z-Index
        modal.style.zIndex = this.baseZIndex + this.modalStack.length;
        modal.classList.add('show');
        modal.classList.remove('hide');
        
        // Füge Modal zum Stack hinzu
        if (!this.activeModals.has(modalId)) {
            this.modalStack.push(modalId);
            this.activeModals.add(modalId);
        }
    },

    /**
     * Schließt ein Modal.
     * @param {string} modalId - Die ID des Modal-Elements.
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modals: Modal mit ID "${modalId}" nicht gefunden.`);
            return;
        }
        
        // Animation
        modal.classList.add('hide');
        
        // Entferne das Modal aus dem Stack nach der Animation
        setTimeout(() => {
            modal.classList.remove('show', 'hide');
            this.activeModals.delete(modalId);
            const index = this.modalStack.indexOf(modalId);
            if (index > -1) {
                this.modalStack.splice(index, 1);
            }
            
            // Setze den Zustand zurück, falls das Modal eine Logik-Funktion hat
            this.resetModalState(modalId);
        }, 300); // Entspricht der CSS-Transitionsdauer
    },
    
    /**
     * Setzt den Zustand eines Modals zurück, falls notwendig.
     * @param {string} modalId - Die ID des geschlossenen Modals.
     */
    resetModalState(modalId) {
        switch (modalId) {
            case 'newExerciseModal':
                if (Exercises.isEditing) {
                    Exercises.stopEdit();
                }
                break;
            case 'newWorkoutModal':
                if (Workouts.isEditing) {
                    Workouts.stopEdit();
                }
                break;
            case 'newTemplateModal':
                // Templates.stopEdit(); // Falls ein Bearbeitungsmodus existiert
                break;
        }
    },

    /**
     * Erstellt ein allgemeines Bestätigungsmodal.
     */
    createConfirmationModal() {
        const modalHTML = `
            <div id="confirmationModal" class="modal">
                <div class="modal-content modal-sm">
                    <div class="modal-header">
                        <h3 class="modal-title">Bestätigen</h3>
                        <button class="close" onclick="Modals.closeModal('confirmationModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p id="confirmationMessage"></p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="Modals.closeModal('confirmationModal')">Abbrechen</button>
                        <button class="btn btn-primary" id="confirmActionButton">Bestätigen</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    /**
     * Zeigt das Bestätigungsmodal an und führt eine Funktion aus, wenn der Benutzer bestätigt.
     * @param {string} message - Die Nachricht, die im Modal angezeigt werden soll.
     * @param {Function} onConfirm - Die Funktion, die bei Bestätigung ausgeführt wird.
     */
    showConfirmationModal(message, onConfirm) {
        const messageElement = document.getElementById('confirmationMessage');
        const actionButton = document.getElementById('confirmActionButton');

        if (messageElement && actionButton) {
            messageElement.textContent = message;
            
            // Entferne alte Event-Listener
            const newActionButton = actionButton.cloneNode(true);
            actionButton.parentNode.replaceChild(newActionButton, actionButton);
            
            newActionButton.addEventListener('click', () => {
                onConfirm();
                this.closeModal('confirmationModal');
            });
            
            this.showModal('confirmationModal');
        }
    },
    
    /**
     * Fügt die CSS-Animationen für die Modals in den Header ein.
     */
    createModalAnimations() {
        const animationCSS = `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            
            .modal.show {
                display: flex;
                animation: fadeIn 0.3s forwards;
            }
            
            .modal.hide {
                animation: fadeOut 0.3s forwards;
            }
            
            .modal-content.show {
                animation: slideInDown 0.3s forwards;
            }
            
            .modal-content.hide {
                animation: slideOutUp 0.3s forwards;
            }
        `;
        
        if (!document.getElementById('modal-animations')) {
            const style = document.createElement('style');
            style.id = 'modal-animations';
            style.textContent = animationCSS;
            document.head.appendChild(style);
        }
    }
};
