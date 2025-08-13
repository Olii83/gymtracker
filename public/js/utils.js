// Utility-Funktionen für Gym Tracker

const Utils = {
    API_BASE: '/api',

    /**
     * Zeigt eine Benachrichtigung an
     * @param {string} message - Nachricht
     * @param {string} type - Typ: 'info', 'success', 'error', 'warning'
     * @param {string} containerId - ID des Alert-Containers
     */
    showAlert(message, type = 'info', containerId = 'alertContainer') {
        const alertContainer = document.getElementById(containerId);
        if (!alertContainer) return;

        // Erstelle neues Alert-Element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        // Ersetze vorherige Alerts
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alert);
        
        // Automatisches Ausblenden nach 5 Sekunden
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    },

    /**
     * Formatiert ein Datum für die Anzeige
     * @param {string} dateString - ISO Datum String
     * @returns {string} - Formatiertes Datum
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Formatiert Datum und Uhrzeit
     * @param {string} dateString - ISO Datum String
     * @returns {string} - Formatiertes Datum mit Uhrzeit
     */
    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Gibt das aktuelle Datum im YYYY-MM-DD Format zurück
     * @returns {string} - Aktuelles Datum
     */
    getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    },

    /**
     * API-Aufruf mit automatischer Token-Behandlung
     * @param {string} endpoint - API Endpunkt
     * @param {object} options - Fetch-Optionen
     * @returns {Promise} - API Response
     */
    async apiCall(endpoint, options = {}) {
        const url = `${this.API_BASE}${endpoint}`;
        const authToken = localStorage.getItem('authToken');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            // Token abgelaufen - automatisch ausloggen
            if (response.status === 401) {
                Auth.logout();
                throw new Error('Sitzung abgelaufen. Bitte melden Sie sich erneut an.');
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    /**
     * Validiert E-Mail-Format
     * @param {string} email - E-Mail-Adresse
     * @returns {boolean} - Gültig oder nicht
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Validiert Passwort-Stärke
     * @param {string} password - Passwort
     * @returns {string|null} - Fehlermeldung oder null wenn gültig
     */
    validatePassword(password) {
        if (!password) return 'Passwort ist erforderlich';
        if (password.length < 6) return 'Passwort muss mindestens 6 Zeichen lang sein';
        return null;
    },

    /**
     * Bereinigt Eingaben zur XSS-Prävention
     * @param {string} input - Eingabetext
     * @returns {string} - Bereinigter Text
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },

    /**
     * Parst JSON sicher
     * @param {string} jsonString - JSON String
     * @param {*} defaultValue - Standardwert bei Fehler
     * @returns {*} - Geparste Daten oder Standardwert
     */
    parseJSON(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('Failed to parse JSON:', error);
            return defaultValue;
        }
    },

    /**
     * Debounce-Funktion für Performance-Optimierung
     * @param {Function} func - Auszuführende Funktion
     * @param {number} wait - Wartezeit in ms
     * @returns {Function} - Debounced Funktion
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Erstellt eine tiefe Kopie eines Objekts
     * @param {*} obj - Zu kopierendes Objekt
     * @returns {*} - Kopierte Daten
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    },

    /**
     * Lädt aktuellen Benutzer aus localStorage
     * @returns {object|null} - Benutzerdaten oder null
     */
    getCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.warn('Failed to get current user:', error);
            return null;
        }
    },

    /**
     * Speichert aktuellen Benutzer in localStorage
     * @param {object|null} user - Benutzerdaten
     */
    setCurrentUser(user) {
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('currentUser');
        }
    },

    /**
     * Schaltet Sichtbarkeit eines Elements um
     * @param {string} elementId - Element-ID
     * @param {boolean|null} show - Explizit anzeigen/verstecken oder umschalten
     */
    toggleElement(elementId, show = null) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (show === null) {
            element.classList.toggle('hidden');
        } else {
            if (show) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }
    },

    /**
     * Scrollt sanft zum Seitenanfang
     */
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    },

    /**
     * Kopiert Text in die Zwischenablage
     * @param {string} text - Zu kopierender Text
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showAlert('Text in Zwischenablage kopiert', 'success');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showAlert('Fehler beim Kopieren in die Zwischenablage', 'error');
        }
    },

    /**
     * Lädt Daten als JSON-Datei herunter
     * @param {object} data - Zu exportierende Daten
     * @param {string} filename - Dateiname
     */
    downloadJSON(data, filename = 'gym-tracker-data.json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Gibt verfügbare Übungskategorien zurück
     * @returns {string[]} - Array der Kategorien
     */
    getExerciseCategories() {
        return [
            'Krafttraining',
            'Cardio',
            'Stretching',
            'Functional'
        ];
    },

    /**
     * Gibt verfügbare Muskelgruppen zurück
     * @returns {string[]} - Array der Muskelgruppen
     */
    getMuscleGroups() {
        return [
            'Brust',
            'Rücken',
            'Schultern',
            'Arme',
            'Beine',
            'Core',
            'Cardio',
            'Ganzkörper'
        ];
    },

    /**
     * Formatiert Trainingsdauer in lesbarer Form
     * @param {number} minutes - Dauer in Minuten
     * @returns {string} - Formatierte Dauer
     */
    formatDuration(minutes) {
        if (!minutes || minutes <= 0) return 'Dauer nicht erfasst';
        
        if (minutes < 60) {
            return `${minutes} Minuten`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            
            if (remainingMinutes === 0) {
                return `${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
            } else {
                return `${hours}h ${remainingMinutes}min`;
            }
        }
    },

    /**
     * Generiert eindeutige ID
     * @returns {string} - Eindeutige ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Speichert Daten in localStorage
     * @param {string} key - Schlüssel
     * @param {*} value - Wert
     */
    setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Failed to set localStorage:', error);
        }
    },

    /**
     * Lädt Daten aus localStorage
     * @param {string} key - Schlüssel
     * @param {*} defaultValue - Standardwert wenn nicht vorhanden
     * @returns {*} - Geladene Daten oder Standardwert
     */
    getLocalStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Failed to get localStorage:', error);
            return defaultValue;
        }
    },

    /**
     * Entfernt Daten aus localStorage
     * @param {string} key - Schlüssel
     */
    removeLocalStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Failed to remove localStorage:', error);
        }
    },

    /**
     * Prüft ob Element im Viewport sichtbar ist
     * @param {Element} element - DOM Element
     * @returns {boolean} - Sichtbar oder nicht
     */
    isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    /**
     * Scrollt sanft zu einem Element
     * @param {string} elementId - Element-ID
     */
    scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    },

    /**
     * Event-Delegation Helper
     * @param {Element} parent - Parent Element
     * @param {string} eventType - Event-Typ
     * @param {string} selector - CSS-Selektor
     * @param {Function} handler - Event-Handler
     */
    delegate(parent, eventType, selector, handler) {
        parent.addEventListener(eventType, function(event) {
            const target = event.target.closest(selector);
            if (target && parent.contains(target)) {
                handler.call(target, event);
            }
        });
    }
};

// Initialisierung nach DOM-Load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Utils: Initialisiere Event-Listener...');
    
    // Modal-Schließung bei Klick außerhalb
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };

    // Modal-Schließung mit Escape-Taste
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });

    console.log('Utils: Event-Listener erfolgreich eingerichtet');
});